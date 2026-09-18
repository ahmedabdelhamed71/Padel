import { Trophy, Users, CalendarDays, TrendingUp } from "lucide-react";

export default function Overview({ rows, matches, scoring, fixtures, onLeague, onFriendly }) {
  const leader = matches.length > 0 ? rows[0] : null;
  const leaguePlayers = new Set(fixtures.flatMap((fixture) =>
    [...fixture.teamA.split(" / "), ...fixture.teamB.split(" / ")]
  )).size;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RIVERSIDE PADEL CLUB</span>
          <h1>Competitions</h1>
          <p>Manage your league and your friendly padel group from one place.</p>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon"><Trophy size={20} /></div>
          <div><span>Competitions</span><strong>2</strong><small>1 league · 1 friendly</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><Users size={20} /></div>
          <div><span>Friendly players</span><strong>{rows.length}</strong><small>Active this month</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><CalendarDays size={20} /></div>
          <div><span>Friendly matches</span><strong>{matches.length}</strong><small>Manually added</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><TrendingUp size={20} /></div>
          <div><span>Current leader</span><strong className="leader-name">{leader?.name ?? "No results yet"}</strong><small>{leader ? `${leader.points} points` : "Add a friendly match"}</small></div>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">ACTIVE</span>
            <h2>Your competitions</h2>
          </div>
        </div>

        <div className="competition-grid">
          <button className="competition-card" onClick={onLeague}>
            <div className="competition-card-top">
              <span className="competition-type league">LEAGUE</span>
              <span className="sport-pill">PADEL</span>
            </div>
            <h3>Autumn Padel League</h3>
            <p>Fixed schedule with generated fixtures. Matches cannot be added manually.</p>
            <div className="competition-card-bottom">
              <span>{leaguePlayers} players</span>
              <strong>View league →</strong>
            </div>
          </button>

          <button className="competition-card featured" onClick={onFriendly}>
            <div className="competition-card-top">
              <span className="competition-type friendly">FRIENDLY GROUP</span>
              <span className="sport-pill">PADEL</span>
            </div>
            <h3>Friday Padel Friends</h3>
            <p>Manual matches with a proper points table: {scoring.win} for a win, {scoring.loss} for a loss.</p>
            <div className="competition-card-bottom">
              <span>{rows.length} players</span>
              <strong>View group →</strong>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
