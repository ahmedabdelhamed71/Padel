import test from "node:test";
import assert from "node:assert/strict";
import { buildLeagueStandings } from "../src/utils.js";

test("resetting standings keeps player names but returns their stats and points to zero", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" },
    { id: "p3", name: "Omar", initials: "OM" },
    { id: "p4", name: "Karim", initials: "KA" }
  ];

  const historicalMatch = {
    id: "m1",
    teamAId: "old-a",
    teamBId: "old-b",
    teamAPlayerIds: ["p1", "p2"],
    teamBPlayerIds: ["p3", "p4"],
    scoreA: 2,
    scoreB: 0,
    status: "played",
    standingsReset: true
  };

  const rows = buildLeagueStandings(
    players,
    [],
    [historicalMatch],
    { win: 3, loss: 0, play: 1 }
  );

  assert.equal(rows.length, 4);
  assert.equal(rows.every((row) =>
    row.played === 0 &&
    row.wins === 0 &&
    row.losses === 0 &&
    row.points === 0
  ), true);
});
