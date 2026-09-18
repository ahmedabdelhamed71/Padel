import { Plus, Settings2, Trash2, Trophy, UserPlus } from "lucide-react";
import StandingsTable from "../components/StandingsTable";
import PointsSettings from "../components/PointsSettings";
import { formatMatchDate } from "../utils";

export default function Friendly({
  rows,
  matches,
  players,
  scoring,
  setScoring,
  onAddMatch,
  onAddPlayer,
  onClearMatches,
  onDeletePlayer,
  tab = "standings",
  onTabChange: setTab
}) {
  const playerName = (id) => players.find((player) => player.id === id)?.name ?? "Unknown";

  return (
    <div className="page">
      <div className="page-heading page-heading-split friendly-heading">
        <div>
          <span className="eyebrow">FRIENDLY GROUP</span>
          <h1>Friday Padel Friends</h1>
          <p>Flexible matches added by players — now with points.</p>
        </div>

        <div className="group-actions">
          <button className="button secondary" onClick={onAddPlayer}>
            <UserPlus size={17} /> Add player
          </button>
          <button className="button primary" onClick={onAddMatch} disabled={players.length < 4}>
            <Plus size={17} /> Add match
          </button>
          <button className="button danger-outline" onClick={onClearMatches} disabled={matches.length === 0}>
            <Trash2 size={17} /> Delete all matches
          </button>
        </div>
      </div>

      {tab !== "settings" && <div className="points-banner">
        <div className="points-banner-icon"><Trophy size={19} /></div>
        <div>
          <strong>Friendly points are enabled</strong>
          <span>Play = {scoring.play ?? 1} pt · Win = {scoring.win} pts · Loss = {scoring.loss} pts · standings are sorted by points first.</span>
        </div>
        <button className="text-button" onClick={() => setTab("settings")}>
          <Settings2 size={15} />
          Edit scoring
        </button>
      </div>}

      <div className="tabs">
        <button className={tab === "standings" ? "active" : ""} onClick={() => setTab("standings")}>Standings</button>
        <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}>Matches</button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Points settings</button>
      </div>

      {tab === "standings" && (
        <section className="panel tab-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">LEADERBOARD</span>
              <h2>Friendly standings</h2>
              <p>This replaces the old wins-only ranking.</p>
            </div>
          </div>
          <StandingsTable rows={rows} onDeletePlayer={onDeletePlayer} />
        </section>
      )}

      {tab === "matches" && (
        <section className="panel tab-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">RESULTS</span>
              <h2>Friendly match history</h2>
            </div>
            <button className="button primary small" onClick={onAddMatch} disabled={players.length < 4}>
              <Plus size={16} />
              Add match
            </button>
          </div>

          <div className="match-list">
            {[...matches].reverse().map((match) => (
              <article className="match-row search-destination" id={`match-${match.id}`} tabIndex={-1} key={match.id}>
                <time dateTime={match.date}>{formatMatchDate(match.date)}</time>
                <div className="match-team">
                  <strong>{playerName(match.teamA[0])}</strong>
                  <span>{playerName(match.teamA[1])}</span>
                </div>
                <div className="match-score">{match.scoreA}<span>–</span>{match.scoreB}</div>
                <div className="match-team right">
                  <strong>{playerName(match.teamB[0])}</strong>
                  <span>{playerName(match.teamB[1])}</span>
                </div>
              </article>
            ))}
            {matches.length === 0 && <p>No matches yet. Add your first result to get started.</p>}
          </div>
        </section>
      )}

      {tab === "settings" && (
        <section className="panel tab-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">SCORING</span>
              <h2>Friendly points settings</h2>
              <p>These values affect the Friendly Group only.</p>
            </div>
          </div>

          <PointsSettings scoring={scoring} setScoring={setScoring} />

          <div className="rule-card">
            <strong>How the ranking works</strong>
            <span>1. Points</span>
            <span>2. Wins</span>
            <span>3. Fewer losses</span>
          </div>
        </section>
      )}
    </div>
  );
}
