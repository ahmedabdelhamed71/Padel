import test from "node:test";
import assert from "node:assert/strict";
import { buildLeagueStandings, serializeLeagueStandings } from "../src/utils.js";
import { LEAGUE_STANDINGS_KEY, loadLeagueStandings, saveStorage } from "../src/storage.js";

test("clearing league matches keeps the current standings until Reset points is used", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" },
    { id: "p3", name: "Omar", initials: "OM" },
    { id: "p4", name: "Karim", initials: "KA" }
  ];
  const teams = [
    { id: "team-a", playerIds: ["p1", "p2"] },
    { id: "team-b", playerIds: ["p3", "p4"] }
  ];
  const matches = [{
    id: "league-match-1",
    status: "played",
    teamAId: "team-a",
    teamBId: "team-b",
    scoreA: 2,
    scoreB: 0
  }];
  const scoring = { play: 1, win: 3, loss: 0 };

  const beforeClear = buildLeagueStandings(players, teams, matches, scoring);
  const afterClear = buildLeagueStandings(
    players,
    [],
    [],
    scoring,
    serializeLeagueStandings(beforeClear)
  );

  assert.deepEqual(
    afterClear.map(({ id, played, wins, losses, points }) => ({ id, played, wins, losses, points })),
    beforeClear.map(({ id, played, wins, losses, points }) => ({ id, played, wins, losses, points }))
  );

  const afterReset = buildLeagueStandings(players, [], [], scoring, []);
  assert.equal(
    afterReset.every((row) => row.played === 0 && row.wins === 0 && row.losses === 0 && row.points === 0),
    true
  );
});

test("carried league standings survive reloading and ignore corrupt entries", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" }
  ];
  const storageValues = new Map();
  const storage = {
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value)
  };
  const carry = [{ playerId: "p1", played: 100, wins: 70, losses: 30, points: 310, form: ["W", "L"] }];

  assert.equal(saveStorage(LEAGUE_STANDINGS_KEY, carry, storage), true);
  assert.deepEqual(loadLeagueStandings(players, storage), carry);

  storageValues.set(LEAGUE_STANDINGS_KEY, JSON.stringify([
    ...carry,
    { playerId: "p1", played: 1, wins: 1, losses: 0, points: 4, form: ["W"] },
    { playerId: "missing", played: 1, wins: 1, losses: 0, points: 4, form: ["W"] },
    { playerId: "p2", played: -1, wins: 0, losses: 0, points: 0, form: [] }
  ]));
  assert.deepEqual(loadLeagueStandings(players, storage), carry);
});

test("deleting played league matches retains upcoming fixtures and current standings", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" },
    { id: "p3", name: "Omar", initials: "OM" },
    { id: "p4", name: "Karim", initials: "KA" }
  ];
  const teams = [
    { id: "team-a", playerIds: ["p1", "p2"] },
    { id: "team-b", playerIds: ["p3", "p4"] }
  ];
  const matches = [
    { id: "played", status: "played", teamAId: "team-a", teamBId: "team-b", scoreA: 2, scoreB: 0 },
    { id: "upcoming", status: "scheduled", teamAId: "team-b", teamBId: "team-a", scoreA: null, scoreB: null }
  ];
  const scoring = { play: 1, win: 3, loss: 0 };

  const currentRows = buildLeagueStandings(players, teams, matches, scoring);
  const remainingMatches = matches.filter((match) => match.status !== "played");
  const afterDelete = buildLeagueStandings(
    players,
    teams,
    remainingMatches,
    scoring,
    serializeLeagueStandings(currentRows)
  );

  assert.deepEqual(remainingMatches.map((match) => match.id), ["upcoming"]);
  assert.deepEqual(
    afterDelete.map(({ id, played, wins, losses, points }) => ({ id, played, wins, losses, points })),
    currentRows.map(({ id, played, wins, losses, points }) => ({ id, played, wins, losses, points }))
  );
});
