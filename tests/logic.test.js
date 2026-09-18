import test from "node:test";
import assert from "node:assert/strict";
import { players, starterFriendlyMatches } from "../src/data.js";
import { buildFriendlyStandings, createPlayer, formatMatchDate, getPlayerNameError, isValidMatchResult, localDateString, normalizeMatches, normalizePlayerName, normalizePlayers, normalizeScoring } from "../src/utils.js";
import { loadMatches, loadPlayers, loadScoring, saveStorage, MATCHES_KEY, PLAYERS_KEY } from "../src/storage.js";

const storageWith = (value) => ({ getItem: () => value });
const sample = starterFriendlyMatches[0];

test("starter results and custom scoring retain correct totals and ranking", () => {
  const rows = buildFriendlyStandings(players, starterFriendlyMatches, { win: 3, loss: 0, play: 1 });
  assert.equal(rows[0].name, "Ahmed Hassan");
  assert.equal(rows[0].points, 12);
  assert.equal(rows.reduce((sum, row) => sum + row.played, 0), 16);
  for (const row of rows) assert.equal(row.played, row.wins + row.losses);
  const custom = buildFriendlyStandings(players, starterFriendlyMatches, { win: 5, loss: 1, play: 1 });
  assert.equal(custom.find((row) => row.id === 2).points, 10);
});

test("invalid results cannot award points or crash the standings", () => {
  const invalid = [null, { ...sample, teamA: [1, 999] }, { ...sample, teamA: [1, 1] },
    { ...sample, scoreA: -1 }, { ...sample, scoreA: 1.5 }, { ...sample, scoreA: Infinity },
    { ...sample, scoreA: 0 }, { ...sample, teamB: [3] }];
  for (const match of invalid) assert.equal(isValidMatchResult(match, players), false);
  assert.deepEqual(buildFriendlyStandings(players, invalid, null), buildFriendlyStandings(players, [], null));
  assert.doesNotThrow(() => buildFriendlyStandings(players, null, null));
});

test("corrupt storage falls back without crashing", () => {
  for (const value of [null, "{", "null", "{}", "123"]) {
    assert.deepEqual(loadMatches(players, starterFriendlyMatches, storageWith(value)), starterFriendlyMatches);
    assert.deepEqual(loadScoring(storageWith(value)), { win: 3, loss: 0, play: 1 });
  }
});

test("recovery preserves valid saved matches and an intentionally empty history", () => {
  const entries = [sample, null, { ...sample, id: 2, teamA: [1, 999] },
    { ...sample, id: 3, date: "2026-02-30" }, { ...sample, id: 4, date: "2026-99-99" }, sample];
  assert.deepEqual(loadMatches(players, [], storageWith(JSON.stringify(entries))), [sample]);
  assert.deepEqual(loadMatches(players, starterFriendlyMatches, storageWith("[]")), []);
  assert.deepEqual(normalizeMatches([{ ...sample, id: "new-match", date: "2024-02-29" }], players).length, 1);
});

test("scoring recovery rejects invalid numbers while retaining valid settings", () => {
  for (const win of [-1, 1.5, Infinity, NaN, "5", null]) {
    assert.deepEqual(normalizeScoring({ win, loss: 1 }), { win: 3, loss: 1, play: 1 });
  }
  assert.deepEqual(loadScoring(storageWith('{"win":0,"loss":0}')), { win: 0, loss: 0, play: 1 });
});

test("blocked or full storage does not throw and reports an unsuccessful save", () => {
  const blocked = {
    getItem() { throw new Error("Access denied"); },
    setItem() { throw new Error("Quota exceeded"); }
  };
  assert.deepEqual(loadMatches(players, starterFriendlyMatches, blocked), starterFriendlyMatches);
  assert.deepEqual(loadScoring(blocked), { win: 3, loss: 0, play: 1 });
  assert.equal(saveStorage(MATCHES_KEY, starterFriendlyMatches, blocked), false);
  const values = new Map();
  assert.equal(saveStorage(MATCHES_KEY, [sample], { setItem: (key, value) => values.set(key, value) }), true);
  assert.deepEqual(JSON.parse(values.get(MATCHES_KEY)), [sample]);
});

test("match dates preserve the local day around midnight in different time zones", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "Africa/Cairo";
    assert.equal(localDateString(new Date("2026-09-16T00:30:00+03:00")), "2026-09-16");
    process.env.TZ = "America/New_York";
    assert.equal(localDateString(new Date("2026-09-16T23:30:00-04:00")), "2026-09-16");
    assert.match(formatMatchDate("2026-09-16"), /^16 /);
    assert.equal(formatMatchDate("2026-02-30"), "Unknown date");
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("player names support Arabic and prevent duplicates after whitespace and Unicode normalization", () => {
  assert.equal(normalizePlayerName("  أحمد \t محمد \n علي  "), "أحمد محمد علي");
  assert.equal(getPlayerNameError("  ahmed   HASSAN ", players), "A player with this name already exists.");
  assert.equal(getPlayerNameError("  أحمد   علي ", [{ name: "أحمد علي" }]), "A player with this name already exists.");
  assert.equal(getPlayerNameError("Jose\u0301", [{ name: "José" }]), "A player with this name already exists.");
  assert.equal(getPlayerNameError("أحمد علي", players), "");
  for (const name of [null, {}, "", " \t", "A", "أ".repeat(61)]) {
    assert.notEqual(getPlayerNameError(name, players), "");
  }
  assert.equal(getPlayerNameError("أ".repeat(60), players), "");
  const player = createPlayer("  أحمد محمد علي ");
  assert.match(player.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(player.name, "أحمد محمد علي");
  assert.equal(player.initials, "أع");
  assert.equal(createPlayer("Omar").initials, "OM");
});

test("roster recovery retains seeds and valid added players while removing malformed entries", () => {
  for (const value of [null, "{", "null", "{}", "123", "[]"]) {
    assert.deepEqual(loadPlayers(players, storageWith(value)), players);
  }
  const added = createPlayer("  Sara   Mostafa ");
  const entries = [null, {}, { ...added, initials: "wrong" }, { ...added, name: "Another Player" },
    { id: 1, name: "Replacement Seed" }, { id: "bad-id", name: "Invalid Player" },
    { id: -1, name: "Invalid Number" }, { id: 1.5, name: "Invalid Decimal" },
    { ...createPlayer("AHMED HASSAN") }, { ...createPlayer("Sara Mostafa") },
    { ...createPlayer("Short Name"), name: "X" }];
  assert.deepEqual(normalizePlayers(entries, players), [...players, added]);
  assert.deepEqual(loadPlayers(players, { getItem() { throw new Error("Blocked"); } }), players);
});

test("saved added players and mixed-ID match results survive reloading together", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const added = createPlayer("Sara Mostafa");
  const roster = [...players, added];
  const match = { ...sample, id: "added-player-match", teamA: [1, added.id] };
  assert.equal(saveStorage(PLAYERS_KEY, roster, storage), true);
  assert.equal(saveStorage(MATCHES_KEY, [match], storage), true);
  const loadedPlayers = loadPlayers(players, storage);
  const loadedMatches = loadMatches(loadedPlayers, starterFriendlyMatches, storage);
  assert.deepEqual(loadedPlayers, roster);
  assert.deepEqual(loadedMatches, [match]);
  const addedStanding = buildFriendlyStandings(loadedPlayers, loadedMatches, { win: 3, loss: 0, play: 1 })
    .find((row) => row.id === added.id);
  assert.equal(addedStanding.played, 1);
  assert.equal(addedStanding.points, 4);
  assert.equal(saveStorage(MATCHES_KEY, [], storage), true);
  assert.deepEqual(loadMatches(loadPlayers(players, storage), starterFriendlyMatches, storage), []);
  const clearedRows = buildFriendlyStandings(loadedPlayers, [], { win: 3, loss: 0, play: 1 });
  assert.equal(clearedRows.length, roster.length);
  assert.equal(clearedRows.every((row) => row.played === 0 && row.points === 0), true);
});
