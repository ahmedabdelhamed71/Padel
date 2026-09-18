import { formatMatchDate } from "./utils.js";

const competitions = [
  { id: "league", name: "Autumn Padel League", description: "League · Fixed fixtures", page: "league" },
  { id: "friendly", name: "Friday Padel Friends", description: "Friendly Group · Standings and results", page: "friendly", tab: "standings" }
];

function normalize(value) {
  return String(value).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function searchClub(query, rows, matches, players, fixtures) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const includes = (...values) => {
    const text = normalize(values.join(" "));
    return terms.length > 0 && terms.every((term) => text.includes(term));
  };
  const playerName = (id) => players.find((player) => player.id === id)?.name ?? "Unknown";
  const teamName = (ids) => ids.map(playerName).join(" / ");

  return [
    {
      title: "Players",
      kind: "player",
      items: rows.filter((row) => includes(row.name, row.initials)).map((row) => ({
        id: row.id,
        title: row.name,
        detail: `${row.points} points · ${row.wins} wins · ${row.played} matches`,
        page: "friendly",
        tab: "standings",
        targetId: `player-${row.id}`
      }))
    },
    {
      title: "Competitions",
      kind: "competition",
      items: competitions.filter((competition) => includes(competition.name, competition.description)).map((competition) => ({
        ...competition,
        title: competition.name,
        detail: competition.description
      }))
    },
    {
      title: "Friendly matches",
      kind: "match",
      items: [...matches].reverse().filter((match) => includes(
        teamName(match.teamA), teamName(match.teamB), match.date, formatMatchDate(match.date),
        `${match.scoreA}-${match.scoreB}`, "Friday Padel Friends Friendly Group"
      )).map((match) => ({
        id: match.id,
        title: `${teamName(match.teamA)} vs ${teamName(match.teamB)}`,
        detail: `${formatMatchDate(match.date)} · ${match.scoreA}–${match.scoreB} · Friday Padel Friends`,
        page: "matches",
        tab: "matches",
        targetId: `match-${match.id}`
      }))
    },
    {
      title: "League fixtures",
      kind: "fixture",
      items: fixtures.filter((fixture) => includes(
        fixture.teamA, fixture.teamB, fixture.round, fixture.date, fixture.time, "Autumn Padel League"
      )).map((fixture) => ({
        id: fixture.id,
        title: `${fixture.teamA} vs ${fixture.teamB}`,
        detail: `${fixture.round} · ${fixture.date} · ${fixture.time}`,
        page: "league",
        targetId: `fixture-${fixture.id}`
      }))
    }
  ];
}
