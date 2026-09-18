import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLeagueStandings,
  generateLeagueTeamRoundRobin
} from "../src/utils.js";

test("old played league results still count after generating a new schedule with new teams", () => {
  const players = [
    { id: "p1", name: "Ahmed", initials: "AH" },
    { id: "p2", name: "Ziad", initials: "ZI" },
    { id: "p3", name: "Omar", initials: "OM" },
    { id: "p4", name: "Karim", initials: "KA" }
  ];

  const oldPlayed = {
    id: "old-match",
    teamAId: "old-a",
    teamBId: "old-b",
    teamAPlayerIds: ["p1", "p2"],
    teamBPlayerIds: ["p3", "p4"],
    scoreA: 2,
    scoreB: 0,
    status: "played",
    source: "generated",
    standingsReset: false
  };

  const newTeams = [
    { id: "new-a", playerIds: ["p1", "p3"] },
    { id: "new-b", playerIds: ["p2", "p4"] }
  ];

  const newSchedule = generateLeagueTeamRoundRobin(newTeams);
  const rows = buildLeagueStandings(
    players,
    newTeams,
    [oldPlayed, ...newSchedule],
    { win: 3, loss: 0, play: 1 }
  );

  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get("p1").points, 4);
  assert.equal(byId.get("p2").points, 4);
  assert.equal(byId.get("p3").points, 1);
  assert.equal(byId.get("p4").points, 1);
});
