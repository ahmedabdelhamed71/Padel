import test from "node:test";
import assert from "node:assert/strict";
import { generateLeagueTeamRoundRobin } from "../src/utils.js";

const makeTeams = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    playerIds: [`p-${index * 2 + 1}`, `p-${index * 2 + 2}`]
  }));

function countsByTeam(teams, matches) {
  const counts = new Map(teams.map((team) => [team.id, 0]));

  for (const match of matches) {
    counts.set(match.teamAId, counts.get(match.teamAId) + 1);
    counts.set(match.teamBId, counts.get(match.teamBId) + 1);
  }

  return counts;
}

test("seven teams single round gives each team six matches and 21 total", () => {
  const teams = makeTeams(7);
  const matches = generateLeagueTeamRoundRobin(teams, "single");
  const counts = countsByTeam(teams, matches);

  assert.equal(matches.length, 21);
  for (const count of counts.values()) {
    assert.equal(count, 6);
  }

  const pairs = new Set(
    matches.map((match) => [match.teamAId, match.teamBId].sort().join("|"))
  );
  assert.equal(pairs.size, 21);
});

test("seven teams home and away gives each team twelve matches and 42 total", () => {
  const teams = makeTeams(7);
  const matches = generateLeagueTeamRoundRobin(teams, "double");
  const counts = countsByTeam(teams, matches);

  assert.equal(matches.length, 42);
  for (const count of counts.values()) {
    assert.equal(count, 12);
  }

  const pairCounts = new Map();
  for (const match of matches) {
    const key = [match.teamAId, match.teamBId].sort().join("|");
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  assert.equal(pairCounts.size, 21);
  for (const count of pairCounts.values()) {
    assert.equal(count, 2);
  }
});
