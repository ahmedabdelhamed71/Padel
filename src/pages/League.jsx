import { useMemo, useState } from "react";
import { CalendarDays, Plus, Shuffle, Trash2, UserPlus, Users } from "lucide-react";
import StandingsTable from "../components/StandingsTable";
import AddLeaguePlayerModal from "../components/AddLeaguePlayerModal";
import AddLeagueTeamModal from "../components/AddLeagueTeamModal";
import AddLeagueMatchModal from "../components/AddLeagueMatchModal";
import LeagueResultModal from "../components/LeagueResultModal";
import LeagueDateModal from "../components/LeagueDateModal";
import GenerateLeagueMatchesModal from "../components/GenerateLeagueMatchesModal";
import {
  buildLeagueStandings,
  formatMatchDate,
  generateLeagueTeamRoundRobin,
  serializeLeagueStandings
} from "../utils";

export default function League({
  players,
  teams,
  matches,
  carriedStandings,
  scoring,
  onPlayersChange,
  onTeamsChange,
  onMatchesChange,
  onCarriedStandingsChange
}) {
  const [tab, setTab] = useState("fixtures");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [resultMatch, setResultMatch] = useState(null);
  const [dateMatch, setDateMatch] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const rows = useMemo(
    () => buildLeagueStandings(players, teams, matches, scoring, carriedStandings),
    [players, teams, matches, scoring, carriedStandings]
  );

  const playerName = (id) =>
    players.find((player) => player.id === id)?.name ?? "Unknown";

  const teamName = (teamId) => {
    const team = teams.find((item) => item.id === teamId);
    return team ? team.playerIds.map(playerName).join(" / ") : "Unknown";
  };

  const matchTeamName = (match, side) => {
    const teamId = side === "A" ? match.teamAId : match.teamBId;
    const snapshot = side === "A" ? match.teamAPlayerIds : match.teamBPlayerIds;
    const current = teams.find((team) => team.id === teamId);

    if (current) return current.playerIds.map(playerName).join(" / ");
    if (Array.isArray(snapshot) && snapshot.length === 2) {
      return snapshot.map(playerName).join(" / ");
    }

    return "Former team";
  };

  const withTeamSnapshots = (match) => ({
    ...match,
    teamAPlayerIds:
      Array.isArray(match.teamAPlayerIds) && match.teamAPlayerIds.length === 2
        ? match.teamAPlayerIds
        : [...(teams.find((team) => team.id === match.teamAId)?.playerIds ?? [])],
    teamBPlayerIds:
      Array.isArray(match.teamBPlayerIds) && match.teamBPlayerIds.length === 2
        ? match.teamBPlayerIds
        : [...(teams.find((team) => team.id === match.teamBId)?.playerIds ?? [])]
  });

  const usedPlayerIds = useMemo(
    () => new Set(teams.flatMap((team) => team.playerIds)),
    [teams]
  );

  const unassignedPlayers = players.filter(
    (player) => !usedPlayerIds.has(player.id)
  );

  const generate = (format) => {
    // Completed matches are permanent standings/history records.
    // Regenerating replaces only the upcoming generated schedule.
    const completedHistory = matches
      .filter((match) => match.status === "played")
      .map(withTeamSnapshots);

    const pendingManual = matches.filter(
      (match) => match.source === "manual" && match.status !== "played"
    );

    const generated = generateLeagueTeamRoundRobin(teams, format).map((match) => ({
      ...match,
      teamAPlayerIds: [...(teams.find((team) => team.id === match.teamAId)?.playerIds ?? [])],
      teamBPlayerIds: [...(teams.find((team) => team.id === match.teamBId)?.playerIds ?? [])]
    }));

    onMatchesChange([...completedHistory, ...generated, ...pendingManual]);
    setGenerateOpen(false);
    setTab("fixtures");
  };

  const groupMatches = (items) => {
    const rounds = new Map();

    items
      .filter((match) => match.source !== "manual")
      .forEach((match) => {
        const key = `${match.leg ?? 1}-${match.round}`;
        if (!rounds.has(key)) {
          rounds.set(key, {
            round: match.round,
            leg: match.leg ?? 1,
            items: []
          });
        }
        rounds.get(key).items.push(match);
      });

    const result = [...rounds.values()]
      .sort((a, b) => a.round - b.round)
      .map((group) => ({
        label: `Round ${group.round}${group.leg === 2 ? " · Return leg" : ""}`,
        items: group.items
      }));

    const extras = items.filter((match) => match.source === "manual");
    if (extras.length) {
      result.push({ label: "Extra matches", items: extras });
    }

    return result;
  };

  const playedGroups = useMemo(
    () => groupMatches(matches.filter((match) => match.status === "played")),
    [matches]
  );

  const upcomingGroups = useMemo(
    () => groupMatches(matches.filter((match) => match.status !== "played")),
    [matches]
  );

  const deletePlayer = (playerId) => {
    const removedTeamIds = teams
      .filter((team) => team.playerIds.includes(playerId))
      .map((team) => team.id);

    onPlayersChange(players.filter((player) => player.id !== playerId));
    onTeamsChange(teams.filter((team) => !team.playerIds.includes(playerId)));
    onMatchesChange(
      matches.filter(
        (match) =>
          !removedTeamIds.includes(match.teamAId) &&
          !removedTeamIds.includes(match.teamBId)
      )
    );
  };

  const deleteTeam = (teamId) => {
    const nextMatches = matches
      .map(withTeamSnapshots)
      .filter((match) => {
        const usesTeam = match.teamAId === teamId || match.teamBId === teamId;
        return !usesTeam || match.status === "played";
      });

    onTeamsChange(teams.filter((team) => team.id !== teamId));
    onMatchesChange(nextMatches);
  };

  const keepCurrentStandings = () => {
    onCarriedStandingsChange(serializeLeagueStandings(rows));
  };

  return (
    <div className="page">
      <div className="page-heading page-heading-split">
        <div>
          <span className="eyebrow">LEAGUE</span>
          <h1>Autumn Padel League</h1>
          <p>Build fixed 2-player teams, then randomise only the league match order.</p>
        </div>

        <div className="group-actions">
          <button className="button secondary" onClick={() => setPlayerOpen(true)}>
            <UserPlus size={17} /> Add player
          </button>

          <button
            className="button secondary"
            onClick={() => setTeamOpen(true)}
            disabled={unassignedPlayers.length < 2}
          >
            <Users size={17} /> Create team
          </button>

          <button
            className="button secondary"
            disabled={teams.length < 2}
            onClick={() => setMatchOpen(true)}
          >
            <Plus size={17} /> Add match
          </button>

          <button
            className="button primary"
            disabled={teams.length < 2}
            onClick={() => setGenerateOpen(true)}
          >
            <Shuffle size={17} /> Generate matches
          </button>
        </div>
      </div>

      <section className="panel league-player-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PLAYERS</span>
            <h2>League players</h2>
            <p>Add the names first. Then choose exactly which two players form each team.</p>
          </div>
        </div>

        <div className="league-player-list">
          {players.map((player) => (
            <span className="league-player-item" key={player.id}>
              <span className="player-avatar">{player.initials}</span>
              <strong>{player.name}</strong>
              <button
                type="button"
                className="player-delete-button"
                onClick={() => deletePlayer(player.id)}
                title={`Delete ${player.name}`}
                aria-label={`Delete ${player.name}`}
              >
                <Trash2 size={14} />
              </button>
            </span>
          ))}

          {players.length === 0 && (
            <p>No league players yet. Add the first player to start.</p>
          )}
        </div>
      </section>

      <section className="panel league-team-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">TEAMS</span>
            <h2>League teams</h2>
            <p>Partners stay fixed. Generate matches randomises only who plays who first.</p>
          </div>
        </div>

        <div className="league-team-list">
          {teams.map((team, index) => (
            <div className="league-team-item" key={team.id}>
              <span className="league-team-number">Team {index + 1}</span>
              <strong>{teamName(team.id)}</strong>
              <button
                type="button"
                className="player-delete-button"
                onClick={() => deleteTeam(team.id)}
                title="Delete team"
                aria-label={`Delete ${teamName(team.id)}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {teams.length === 0 && (
            <p>No teams yet. Add players, then create the teams manually.</p>
          )}
        </div>

        {unassignedPlayers.length > 0 && (
          <div className="unassigned-note">
            <strong>Not in a team:</strong>{" "}
            {unassignedPlayers.map((player) => player.name).join(", ")}
          </div>
        )}
      </section>

      <div className="tabs league-tabs">
        <button className={tab === "fixtures" ? "active" : ""} onClick={() => setTab("fixtures")}>
          Fixtures
        </button>
        <button className={tab === "standings" ? "active" : ""} onClick={() => setTab("standings")}>
          Standings
        </button>
      </div>

      {tab === "fixtures" && (
        <section className="panel tab-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">FIXTURES</span>
              <h2>League matches</h2>
              <p>Played matches stay separate from the current upcoming schedule.</p>
            </div>

            {matches.length > 0 && (
              <div className="fixture-list-actions">
                <button
                  type="button"
                  className="button danger-outline small"
                  disabled={!matches.some((match) => match.status === "played")}
                  onClick={() => {
                    if (!window.confirm("Delete all played League matches? Upcoming matches and the current League standings points will be kept.")) return;
                    keepCurrentStandings();
                    onMatchesChange(matches.filter((match) => match.status !== "played"));
                  }}
                >
                  Delete played matches
                </button>
                <button
                  type="button"
                  className="button danger-outline small"
                  onClick={() => {
                    if (!window.confirm("Delete all League matches? The match list will be cleared, but the current League standings points will be kept.")) return;
                    keepCurrentStandings();
                    onMatchesChange([]);
                  }}
                >
                  Clear all matches
                </button>
              </div>
            )}
          </div>

          <div className="fixture-list">
            {playedGroups.length > 0 && (
              <div className="fixture-status-section played-section">
                <div className="fixture-status-heading">
                  <strong>Played matches</strong>
                  <span>{matches.filter((match) => match.status === "played").length}</span>
                </div>

                {playedGroups.map((group) => (
                  <div className="league-round" key={`played-${group.label}`}>
                    <div className="league-round-title">{group.label}</div>

                    {group.items.map((fixture) => (
                      <article className="fixture-row" key={fixture.id}>
                        <div className="fixture-round">
                          <CalendarDays size={16} />
                          <span>
                            {fixture.source === "manual" ? "Extra" : group.label}
                            {fixture.date ? ` · ${formatMatchDate(fixture.date)}` : ""}
                          </span>
                        </div>

                        <div className="fixture-teams">
                          <strong>{matchTeamName(fixture, "A")}</strong>
                          <span>{fixture.scoreA} – {fixture.scoreB}</span>
                          <strong>{matchTeamName(fixture, "B")}</strong>
                        </div>

                        <div className="fixture-time league-fixture-actions">
                          <button
                            className="button secondary small"
                            onClick={() => setDateMatch(fixture)}
                          >
                            {fixture.date ? "Edit date" : "Set date"}
                          </button>

                          <button
                            className="button secondary small"
                            onClick={() => setResultMatch(fixture)}
                          >
                            Edit result
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {playedGroups.length > 0 && upcomingGroups.length > 0 && (
              <div className="fixture-history-divider" aria-hidden="true" />
            )}

            {upcomingGroups.length > 0 && (
              <div className="fixture-status-section upcoming-section">
                <div className="fixture-status-heading">
                  <strong>Upcoming matches</strong>
                  <span>{matches.filter((match) => match.status !== "played").length}</span>
                </div>

                {upcomingGroups.map((group) => (
                  <div className="league-round" key={`upcoming-${group.label}`}>
                    <div className="league-round-title">{group.label}</div>

                    {group.items.map((fixture) => (
                      <article className="fixture-row" key={fixture.id}>
                        <div className="fixture-round">
                          <CalendarDays size={16} />
                          <span>
                            {fixture.source === "manual" ? "Extra" : group.label}
                            {fixture.date ? ` · ${formatMatchDate(fixture.date)}` : ""}
                          </span>
                        </div>

                        <div className="fixture-teams">
                          <strong>{matchTeamName(fixture, "A")}</strong>
                          <span>vs</span>
                          <strong>{matchTeamName(fixture, "B")}</strong>
                        </div>

                        <div className="fixture-time league-fixture-actions">
                          <button
                            className="button secondary small"
                            onClick={() => setDateMatch(fixture)}
                          >
                            {fixture.date ? "Edit date" : "Set date"}
                          </button>

                          <button
                            className="button secondary small"
                            onClick={() => setResultMatch(fixture)}
                          >
                            Add result
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {matches.length === 0 && (
              <p>No league matches yet. Create at least two teams and generate the schedule.</p>
            )}
          </div>
        </section>
      )}

      {tab === "standings" && (
        <section className="panel tab-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">TABLE</span>
              <h2>Individual league standings</h2>
              <p>Every player gets participation points, plus win/loss points. Ties on points are decided by score difference.</p>
            </div>

            <button
              className="button danger-outline small"
              type="button"
              onClick={() => {
                if (!window.confirm("Reset League standings points and stats? Match history will be kept.")) return;

                onCarriedStandingsChange([]);
                onMatchesChange(
                  matches.map((match) =>
                    match.status === "played"
                      ? { ...withTeamSnapshots(match), standingsReset: true }
                      : match
                  )
                );
              }}
            >
              Reset points
            </button>
          </div>

          <StandingsTable
            rows={rows}
            onDeletePlayer={deletePlayer}
            showGoalDifference
          />
        </section>
      )}

      {generateOpen && (
        <GenerateLeagueMatchesModal
          teamCount={teams.length}
          onClose={() => setGenerateOpen(false)}
          onGenerate={generate}
        />
      )}

      {playerOpen && (
        <AddLeaguePlayerModal
          players={players}
          onClose={() => setPlayerOpen(false)}
          onSave={(player) => onPlayersChange([...players, player])}
        />
      )}

      {teamOpen && (
        <AddLeagueTeamModal
          players={players}
          teams={teams}
          onClose={() => setTeamOpen(false)}
          onSave={(team) => onTeamsChange([...teams, team])}
        />
      )}

      {matchOpen && (
        <AddLeagueMatchModal
          teams={teams}
          players={players}
          onClose={() => setMatchOpen(false)}
          onSave={(match) => onMatchesChange([...matches, match])}
        />
      )}

      {dateMatch && (
        <LeagueDateModal
          match={dateMatch}
          onClose={() => setDateMatch(null)}
          onSave={(updated) => {
            const snapshot = withTeamSnapshots(updated);
            onMatchesChange(
              matches.map((match) => match.id === snapshot.id ? snapshot : match)
            );
          }}
        />
      )}

      {resultMatch && (
        <LeagueResultModal
          match={resultMatch}
          teams={teams}
          players={players}
          onClose={() => setResultMatch(null)}
          onSave={(updated) => {
            const snapshot = { ...withTeamSnapshots(updated), standingsReset: false };
            onMatchesChange(
              matches.map((match) => match.id === snapshot.id ? snapshot : match)
            );
          }}
        />
      )}
    </div>
  );
}
