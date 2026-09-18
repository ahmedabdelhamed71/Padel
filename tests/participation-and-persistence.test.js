import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFriendlyStandings,
  buildLeagueStandings
} from "../src/utils.js";

test("friendly gives participation points plus result points", () => {
  const players = [
    { id: 1, name: "A", initials: "A" },
    { id: 2, name: "B", initials: "B" },
    { id: 3, name: "C", initials: "C" },
    { id: 4, name: "D", initials: "D" }
  ];

  const matches = [{
    id: "m",
    teamA: [1, 2],
    teamB: [3, 4],
    scoreA: 2,
    scoreB: 0,
    date: "2026-09-17"
  }];

  const rows = buildFriendlyStandings(players, matches, { win: 3, loss: 0, play: 1 });
  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get(1).points, 4);
  assert.equal(byId.get(2).points, 4);
  assert.equal(byId.get(3).points, 1);
  assert.equal(byId.get(4).points, 1);
});

test("league historical points survive after the old teams are removed", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" },
    { id: "p3", name: "Omar", initials: "OM" },
    { id: "p4", name: "Karim", initials: "KA" }
  ];

  const oldMatch = {
    id: "m1",
    teamAId: "old-a",
    teamBId: "old-b",
    teamAPlayerIds: ["p1", "p2"],
    teamBPlayerIds: ["p3", "p4"],
    scoreA: 2,
    scoreB: 1,
    status: "played"
  };

  const newTeams = [
    { id: "new-a", playerIds: ["p1", "p3"] },
    { id: "new-b", playerIds: ["p2", "p4"] }
  ];

  const rows = buildLeagueStandings(
    players,
    newTeams,
    [oldMatch],
    { win: 3, loss: 0, play: 1 }
  );

  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get("p1").points, 4);
  assert.equal(byId.get("p2").points, 4);
  assert.equal(byId.get("p3").points, 1);
  assert.equal(byId.get("p4").points, 1);
});
