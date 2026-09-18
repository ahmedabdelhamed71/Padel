import { DEFAULT_SCORING, normalizeMatches, normalizePlayers, normalizeScoring } from "./utils.js";

export const PLAYERS_KEY = "mp-friendly-players-v3";
export const MATCHES_KEY = "mp-friendly-matches-v3";
export const SCORING_KEY = "mp-friendly-scoring-v2";

function readStorage(key, fallback, storage) {
  try {
    const value = (storage ?? globalThis.localStorage).getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function loadMatches(players, fallback, storage) {
  const value = readStorage(MATCHES_KEY, fallback, storage);
  return normalizeMatches(Array.isArray(value) ? value : fallback, players);
}

export function loadPlayers(fallback, storage) {
  return normalizePlayers(readStorage(PLAYERS_KEY, fallback, storage), fallback);
}

export function loadScoring(storage) {
  return normalizeScoring(readStorage(SCORING_KEY, DEFAULT_SCORING, storage));
}

export function saveStorage(key, value, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}


export const LEAGUE_PLAYERS_KEY = "mp-league-players-v2";
export const LEAGUE_TEAMS_KEY = "mp-league-teams-v1";
export const LEAGUE_MATCHES_KEY = "mp-league-matches-v2";

export function loadLeaguePlayers(storage) {
  return normalizePlayers(readStorage(LEAGUE_PLAYERS_KEY, [], storage), []);
}

export function loadLeagueTeams(players, storage) {
  const value = readStorage(LEAGUE_TEAMS_KEY, [], storage);
  if (!Array.isArray(value)) return [];

  const playerIds = new Set(players.map((player) => player.id));
  const used = new Set();
  const seenIds = new Set();

  return value.filter((team) => {
    if (!team || typeof team !== "object") return false;
    if (typeof team.id !== "string" || !team.id || seenIds.has(team.id)) return false;
    if (!Array.isArray(team.playerIds) || team.playerIds.length !== 2) return false;

    const [a, b] = team.playerIds;
    if (a === b || !playerIds.has(a) || !playerIds.has(b)) return false;
    if (used.has(a) || used.has(b)) return false;

    seenIds.add(team.id);
    used.add(a);
    used.add(b);
    return true;
  });
}

export function loadLeagueMatches(teams, storage) {
  const value = readStorage(LEAGUE_MATCHES_KEY, [], storage);
  if (!Array.isArray(value)) return [];

  const teamIds = new Set(teams.map((team) => team.id));
  const seen = new Set();

  return value.filter((match) => {
    if (!match || typeof match !== "object") return false;
    if (typeof match.id !== "string" || !match.id || seen.has(match.id)) return false;
    if (match.teamAId === match.teamBId) return false;

    const currentTeamsExist =
      teamIds.has(match.teamAId) &&
      teamIds.has(match.teamBId);

    const historicalSnapshotsExist =
      match.status === "played" &&
      Array.isArray(match.teamAPlayerIds) &&
      match.teamAPlayerIds.length === 2 &&
      Array.isArray(match.teamBPlayerIds) &&
      match.teamBPlayerIds.length === 2;

    if (!currentTeamsExist && !historicalSnapshotsExist) return false;

    seen.add(match.id);
    return true;
  });
}
