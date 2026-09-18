import { Trash2 } from "lucide-react";

export default function StandingsTable({ rows, onDeletePlayer }) {
  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>Form</th>
            <th className="points-cell">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} id={`player-${row.id}`} tabIndex={-1} className="search-destination">
              <td>
                <span className={`rank rank-${index + 1}`}>{index + 1}</span>
              </td>
              <td>
                <div className="player-cell">
                  <span className="player-avatar">{row.initials}</span>
                  <strong>{row.name}</strong>
                  {onDeletePlayer && (
                    <button
                      type="button"
                      className="player-delete-button"
                      onClick={() => onDeletePlayer(row.id)}
                      title={`Delete ${row.name}`}
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
              <td>{row.played}</td>
              <td>{row.wins}</td>
              <td>{row.losses}</td>
              <td>
                <div className="form-pills">
                  {row.form.slice(-5).map((result, i) => (
                    <span key={i} className={result === "W" ? "win" : "loss"}>{result}</span>
                  ))}
                </div>
              </td>
              <td className="points-cell">
                <strong>{row.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
