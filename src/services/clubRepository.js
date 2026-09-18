import { leagueFixtures, players as starterPlayers, starterFriendlyMatches } from "../data.js";
import { loadMatches, loadPlayers, loadScoring, saveStorage, MATCHES_KEY, PLAYERS_KEY, SCORING_KEY } from "../storage.js";
import { getPlayerNameError, isNonNegativeInteger, isValidDate, isValidMatchResult, normalizePlayers } from "../utils.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const copy = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isId = (value) => isText(value) || isNonNegativeInteger(value);
const hasId = (items, id) => items.some((item) => String(item.id) === String(id));
const isScoring = (value) => isObject(value) && isNonNegativeInteger(value.win) && isNonNegativeInteger(value.loss);

function uniqueIds(items) {
  return items.every((item) => isObject(item) && isId(item.id)) &&
    new Set(items.map((item) => String(item.id))).size === items.length;
}

function validateSnapshot(value) {
  if (!isObject(value) || !Array.isArray(value.players) || !Array.isArray(value.matches) ||
      !Array.isArray(value.fixtures) || !isScoring(value.scoring) ||
      !uniqueIds(value.players) || !uniqueIds(value.matches) || !uniqueIds(value.fixtures) ||
      !value.players.every((player) => isText(player.name) && isText(player.initials)) ||
      !value.matches.every((match) => isValidDate(match.date) && isValidMatchResult(match, value.players)) ||
      !value.fixtures.every((fixture) => ["teamA", "teamB", "round", "date", "time"].every((key) => isText(fixture[key])))) {
    throw new Error("The server returned invalid club data.");
  }
  return copy({ players: value.players, matches: value.matches, scoring: value.scoring, fixtures: value.fixtures });
}

function resolveBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new Error("API mode requires VITE_API_BASE_URL, such as /api or https://your-server.example/api.");
  }
  const value = baseUrl.trim();
  if (/[\\\s?#]/.test(value)) throw new Error("The API base URL must be an HTTP(S) URL or an absolute path without a query or fragment.");
  if (value.startsWith("/") && !value.startsWith("//")) return value.replace(/\/+$/, "");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The API base URL must be an HTTP(S) URL or an absolute path such as /api.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("The API base URL must be an HTTP(S) URL without embedded credentials.");
  }
  return value.replace(/\/+$/, "");
}

function responseError(status) {
  if (status === 401 || status === 403) return "The server did not authorize this request. Check your access and try again.";
  if (status === 404) return "The API endpoint was not found. Check the server configuration.";
  if (status === 409) return "The server reported a conflict. Reload the latest club data.";
  if (status === 400 || status === 422) return "The server rejected the submitted data.";
  if (status >= 500) return "The server is temporarily unavailable.";
  return "The server could not complete the request.";
}

/** Local data remains on this device. API mode is opt-in and never imports local saves. */
export function createClubRepository({ mode = "local", baseUrl = "", storage, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
  let data = null;
  let persistenceWarning = false;
  let apiBase = "";
  let configurationError = null;

  try {
    if (mode !== "local" && mode !== "api") throw new Error("VITE_DATA_MODE must be either local or api.");
    if (mode === "api") {
      apiBase = resolveBaseUrl(baseUrl);
      if (typeof fetchImpl !== "function") throw new Error("This browser cannot connect to the API.");
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("The API request timeout must be a positive number.");
    }
  } catch (error) {
    configurationError = error;
  }

  const result = () => ({ data: copy(data), persistenceWarning });
  const checkConfiguration = () => {
    if (configurationError) throw configurationError;
  };

  function saveLocal(nextData) {
    data = copy(nextData);
    // A match must not survive a reload without its newly added players.
    const playersSaved = saveStorage(PLAYERS_KEY, data.players, storage);
    const matchesSaved = playersSaved && saveStorage(MATCHES_KEY, data.matches, storage);
    const scoringSaved = saveStorage(SCORING_KEY, data.scoring, storage);
    persistenceWarning = !playersSaved || !matchesSaved || !scoringSaved;
    return result();
  }

  async function request(path, { method = "GET", body, idempotencyKey } = {}) {
    checkConfiguration();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const mutation = method !== "GET";
    try {
      let response;
      try {
        response = await fetchImpl(`${apiBase}${path}`, {
          method,
          credentials: "same-origin",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(idempotencyKey !== undefined ? { "Idempotency-Key": String(idempotencyKey) } : {})
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });
      } catch {
        throw new Error(timedOut ? "The server took too long to respond." : "Cannot reach the server. Check your connection and try again.");
      }
      if (!response?.ok) throw new Error(responseError(response?.status));
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(timedOut ? "The server took too long to respond." : "The server returned an unreadable response.");
      }
      const nextData = validateSnapshot(payload);
      data = nextData;
      persistenceWarning = false;
      return result();
    } catch (error) {
      if (mutation) {
        throw new Error(`The change could not be confirmed. ${error.message} Reload club data before trying again.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function load() {
    checkConfiguration();
    if (mode === "api") return request("/club");
    if (data) return result();
    const players = loadPlayers(starterPlayers, storage);
    return saveLocal({
      players,
      matches: loadMatches(players, starterFriendlyMatches, storage),
      scoring: loadScoring(storage),
      fixtures: leagueFixtures
    });
  }

  async function ensureLoaded() {
    checkConfiguration();
    if (!data) await load();
  }

  async function addPlayer(player) {
    await ensureLoaded();
    if (!isObject(player) || !isId(player.id) || !isText(player.initials)) throw new Error("Enter a valid player.");
    const nameError = getPlayerNameError(player.name, data.players);
    if (nameError) throw new Error(nameError);
    if (hasId(data.players, player.id)) throw new Error("This player already exists. Reload club data to view the latest roster.");
    if (mode === "api") {
      if (typeof player.id !== "string" || !UUID.test(player.id)) throw new Error("New players require a UUID identifier.");
      return request("/players", { method: "POST", body: player, idempotencyKey: player.id });
    }
    const normalized = normalizePlayers([player], []);
    if (normalized.length !== 1) throw new Error("Enter a valid player identifier and name.");
    return saveLocal({ ...data, players: [...data.players, normalized[0]] });
  }

  async function addMatch(match) {
    await ensureLoaded();
    if (!isObject(match) || !isId(match.id) || !isValidDate(match.date) || !isValidMatchResult(match, data.players)) {
      throw new Error("Choose four different players, a valid date, and different non-negative whole-number scores.");
    }
    if (hasId(data.matches, match.id)) throw new Error("This match already exists. Reload club data to view the latest results.");
    if (mode === "api") {
      if (typeof match.id !== "string" || !UUID.test(match.id)) throw new Error("New matches require a UUID identifier.");
      return request("/matches", { method: "POST", body: match, idempotencyKey: match.id });
    }
    return saveLocal({ ...data, matches: [...data.matches, match] });
  }

  async function updateScoring(scoring) {
    await ensureLoaded();
    if (!isScoring(scoring)) throw new Error("Points must be non-negative whole numbers.");
    const points = { win: scoring.win, loss: scoring.loss };
    if (mode === "api") return request("/scoring", { method: "PUT", body: points });
    return saveLocal({ ...data, scoring: points });
  }

  async function clearMatches() {
    await ensureLoaded();
    if (mode === "api") return request("/matches", { method: "DELETE" });
    return saveLocal({ ...data, matches: [] });
  }

  return { mode, load, addPlayer, addMatch, updateScoring, clearMatches };
}
