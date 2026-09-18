import test from "node:test";
import assert from "node:assert/strict";
import { buildLeagueStandings } from "../src/utils.js";

test("clearing all league matches keeps players but clears all standings stats", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" }
  ];

  const rows = buildLeagueStandings(players, [], [], { win: 3, loss: 0, play: 1 });

  assert.equal(rows.length, 2);
  assert.equal(rows.every((row) =>
    row.played === 0 &&
    row.wins === 0 &&
    row.losses === 0 &&
    row.points === 0
  ), true);
});
