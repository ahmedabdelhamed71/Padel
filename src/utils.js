export const DEFAULT_SCORING = Object.freeze({ win: 3, loss: 0, play: 1 });

export function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function normalizePlayerName(name) {
  return typeof name === "string" ? name.normalize("NFC").trim().replace(/\s+/gu, " ") : "";
}

export function getPlayerNameError(name, players = []) {
  const normalized = normalizePlayerName(name);
  const length = Array.from(normalized).length;
  if (length < 2) return "Enter a player name with at least 2 characters.";
  if (length > 60) return "Player names must be 60 characters or fewer.";
  const key = normalized.toLowerCase();
  if (players.some((player) => normalizePlayerName(player?.name).toLowerCase() === key)) {
    return "A player with this name already exists.";
  }
  return "";
}

function playerInitials(name) {
  const words = name.split(" ");
  return (words.length === 1
    ? Array.from(name).slice(0, 2).join("")
    : Array.from(words[0])[0] + Array.from(words.at(-1))[0]).toUpperCase();
}

export function createPlayer(name) {
  const normalized = normalizePlayerName(name);
  return { id: globalThis.crypto.randomUUID(), name: normalized, initials: playerInitials(normalized) };
}

export function normalizePlayers(saved, fallback) {
  const players = [];
  const ids = new Set();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const add = (player) => {
    if (!player || typeof player !== "object") return;
    const validId = isNonNegativeInteger(player.id) ||
      (typeof player.id === "string" && uuidPattern.test(player.id));
    const idKey = String(player.id).toLowerCase();
    if (!validId || ids.has(idKey) || getPlayerNameError(player.name, players)) return;
    const name = normalizePlayerName(player.name);
    ids.add(idKey);
    players.push({ id: player.id, name, initials: playerInitials(name) });
  };
  if (Array.isArray(fallback)) fallback.forEach(add);
  if (Array.isArray(saved)) saved.forEach(add);
  return players;
}

export function normalizeScoring(scoring) {
  return {
    win: isNonNegativeInteger(scoring?.win) ? scoring.win : DEFAULT_SCORING.win,
    loss: isNonNegativeInteger(scoring?.loss) ? scoring.loss : DEFAULT_SCORING.loss,
    play: isNonNegativeInteger(scoring?.play) ? scoring.play : DEFAULT_SCORING.play
  };
}

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatMatchDate(value) {
  if (!isValidDate(value)) return "Unknown date";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

export function isValidMatchResult(match, players) {
  if (!Array.isArray(match?.teamA) || !Array.isArray(match?.teamB)) return false;
  const ids = [...match.teamA, ...match.teamB];
  return (
    match.teamA.length === 2 && match.teamB.length === 2 &&
    new Set(ids).size === 4 &&
    ids.every((id) => players.some((player) => player.id === id)) &&
    isNonNegativeInteger(match.scoreA) && isNonNegativeInteger(match.scoreB) &&
    match.scoreA !== match.scoreB
  );
}

export function normalizeMatches(matches, players) {
  if (!Array.isArray(matches)) return [];
  const seen = new Set();
  return matches.filter((match) => {
    if (!isValidMatchResult(match, players) || !isValidDate(match.date)) return false;
    const validId = (typeof match.id === "string" && match.id.trim() !== "") ||
      isNonNegativeInteger(match.id);
    const key = String(match.id);
    if (!validId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildFriendlyStandings(players, matches, scoring) {
  const points = normalizeScoring(scoring);
  const table = new Map(
    players.map((player) => [
      player.id,
      {
        ...player,
        played: 0,
        wins: 0,
        losses: 0,
        points: 0,
        form: []
      }
    ])
  );

  for (const match of normalizeMatches(matches, players)) {
    const teamAWon = Number(match.scoreA) > Number(match.scoreB);
    const winners = teamAWon ? match.teamA : match.teamB;
    const losers = teamAWon ? match.teamB : match.teamA;

    for (const playerId of [...match.teamA, ...match.teamB]) {
      const row = table.get(playerId);
      row.played += 1;
      row.points += points.play;
    }

    for (const playerId of winners) {
      const row = table.get(playerId);
      row.wins += 1;
      row.points += points.win;
      row.form.push("W");
    }

    for (const playerId of losers) {
      const row = table.get(playerId);
      row.losses += 1;
      row.points += points.loss;
      row.form.push("L");
    }
  }

  return [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.name.localeCompare(b.name)
  );
}


export function generateLeagueTeamRoundRobin(teams, format = "single") {
  if (!Array.isArray(teams) || teams.length < 2) return [];

  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const rotation = shuffled.map((team) => team.id);

  if (rotation.length % 2 !== 0) rotation.push(null);

  const roundsPerLeg = rotation.length - 1;
  const half = rotation.length / 2;
  const firstLeg = [];

  for (let round = 1; round <= roundsPerLeg; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];

      if (a !== null && b !== null) {
        const flip = Math.random() > 0.5;

        firstLeg.push({
          id: globalThis.crypto.randomUUID(),
          round,
          leg: 1,
          source: "generated",
          teamAId: flip ? b : a,
          teamBId: flip ? a : b,
          scoreA: null,
          scoreB: null,
          status: "scheduled",
          date: ""
        });
      }
    }

    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop());
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  if (format !== "double") {
    return firstLeg;
  }

  const secondLeg = firstLeg.map((match) => ({
    ...match,
    id: globalThis.crypto.randomUUID(),
    round: match.round + roundsPerLeg,
    leg: 2,
    teamAId: match.teamBId,
    teamBId: match.teamAId,
    scoreA: null,
    scoreB: null,
    status: "scheduled",
    date: ""
  }));

  return [...firstLeg, ...secondLeg];
}

export function buildLeagueStandings(players, teams, matches, scoring = DEFAULT_SCORING) {
  const points = normalizeScoring(scoring);
  const table = new Map(
    players.map((player) => [
      player.id,
      { ...player, played: 0, wins: 0, losses: 0, points: 0, form: [] }
    ])
  );

  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const matchPlayerIds = (match, side) => {
    const snapshotKey = side === "A" ? "teamAPlayerIds" : "teamBPlayerIds";
    const teamKey = side === "A" ? "teamAId" : "teamBId";
    const snapshot = match[snapshotKey];

    if (Array.isArray(snapshot) && snapshot.length === 2) {
      return snapshot;
    }

    return teamMap.get(match[teamKey])?.playerIds ?? [];
  };

  for (const match of matches) {
    if (
      match.standingsReset === true ||
      match.status !== "played" ||
      !isNonNegativeInteger(match.scoreA) ||
      !isNonNegativeInteger(match.scoreB) ||
      match.scoreA === match.scoreB
    ) continue;

    const teamAPlayerIds = matchPlayerIds(match, "A");
    const teamBPlayerIds = matchPlayerIds(match, "B");

    if (teamAPlayerIds.length !== 2 || teamBPlayerIds.length !== 2) continue;

    const winners = match.scoreA > match.scoreB ? teamAPlayerIds : teamBPlayerIds;
    const losers = match.scoreA > match.scoreB ? teamBPlayerIds : teamAPlayerIds;

    for (const playerId of [...teamAPlayerIds, ...teamBPlayerIds]) {
      const row = table.get(playerId);
      if (!row) continue;
      row.played += 1;
      row.points += points.play;
    }

    for (const playerId of winners) {
      const row = table.get(playerId);
      if (!row) continue;
      row.wins += 1;
      row.points += points.win;
      row.form.push("W");
    }

    for (const playerId of losers) {
      const row = table.get(playerId);
      if (!row) continue;
      row.losses += 1;
      row.points += points.loss;
      row.form.push("L");
    }
  }

  return [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.name.localeCompare(b.name)
  );
}
