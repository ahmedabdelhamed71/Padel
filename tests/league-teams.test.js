import test from "node:test";
import assert from "node:assert/strict";
import {
  generateLeagueTeamRoundRobin,
  buildLeagueStandings
} from "../src/utils.js";

test("five teams generate ten unique matches and each team plays four times", () => {
  const teams = Array.from({ length: 5 }, (_, i) => ({
    id: `team-${i + 1}`,
    playerIds: [`p${i * 2 + 1}`, `p${i * 2 + 2}`]
  }));

  const matches = generateLeagueTeamRoundRobin(teams);

  assert.equal(matches.length, 10);

  const counts = new Map(teams.map((team) => [team.id, 0]));
  const pairs = new Set();

  for (const match of matches) {
    counts.set(match.teamAId, counts.get(match.teamAId) + 1);
    counts.set(match.teamBId, counts.get(match.teamBId) + 1);
    const key = [match.teamAId, match.teamBId].sort().join("|");
    assert.equal(pairs.has(key), false);
    pairs.add(key);
    assert.equal(match.date, "");
  }

  for (const count of counts.values()) {
    assert.equal(count, 4);
  }
});

test("league standings award team result points to both individual players", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" },
    { id: "p3", name: "Omar", initials: "OM" },
    { id: "p4", name: "Karim", initials: "KA" }
  ];

  const teams = [
    { id: "t1", playerIds: ["p1", "p2"] },
    { id: "t2", playerIds: ["p3", "p4"] }
  ];

  const matches = [{
    id: "m1",
    teamAId: "t1",
    teamBId: "t2",
    scoreA: 2,
    scoreB: 1,
    status: "played"
  }];

  const rows = buildLeagueStandings(players, teams, matches, { win: 3, loss: 0, play: 1 });
  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get("p1").points, 4);
  assert.equal(byId.get("p2").points, 4);
  assert.equal(byId.get("p3").points, 1);
  assert.equal(byId.get("p4").points, 1);
  assert.equal(byId.get("p1").wins, 1);
  assert.equal(byId.get("p2").wins, 1);
});

test("league score difference is applied to both teammates and breaks points ties", () => {
  const players = [
    { id: "p1", name: "Ziad", initials: "ZI" },
    { id: "p2", name: "Youssef", initials: "YO" },
    { id: "p3", name: "Ahmed", initials: "AH" },
    { id: "p4", name: "Amr", initials: "AM" },
    { id: "p5", name: "Omar", initials: "OM" },
    { id: "p6", name: "Karim", initials: "KA" },
    { id: "p7", name: "Hany", initials: "HA" },
    { id: "p8", name: "Samy", initials: "SA" }
  ];
  const teams = [
    { id: "a", playerIds: ["p1", "p2"] },
    { id: "b", playerIds: ["p3", "p4"] },
    { id: "c", playerIds: ["p5", "p6"] },
    { id: "d", playerIds: ["p7", "p8"] }
  ];
  const matches = [
    { id: "m1", teamAId: "a", teamBId: "b", scoreA: 10, scoreB: 0, status: "played" },
    { id: "m2", teamAId: "c", teamBId: "d", scoreA: 3, scoreB: 0, status: "played" }
  ];

  const rows = buildLeagueStandings(players, teams, matches, { win: 3, loss: 0, play: 1 });
  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get("p1").goalDifference, 10);
  assert.equal(byId.get("p2").goalDifference, 10);
  assert.equal(byId.get("p3").goalDifference, -10);
  assert.equal(byId.get("p4").goalDifference, -10);
  assert.deepEqual(rows.slice(0, 4).map((row) => row.id), ["p2", "p1", "p6", "p5"]);
});
