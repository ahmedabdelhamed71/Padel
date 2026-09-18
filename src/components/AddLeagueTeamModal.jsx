import { useMemo, useState } from "react";
import Modal from "./Modal";

export default function AddLeagueTeamModal({ players, teams, onSave, onClose }) {
  const usedIds = new Set(teams.flatMap((team) => team.playerIds));
  const available = players.filter((player) => !usedIds.has(player.id));

  const [first, setFirst] = useState(available[0]?.id ?? "");
  const [second, setSecond] = useState(available[1]?.id ?? "");

  const valid = useMemo(
    () => Boolean(first && second && first !== second),
    [first, second]
  );

  const submit = (event) => {
    event.preventDefault();
    if (!valid) return;

    onSave({
      id: globalThis.crypto.randomUUID(),
      playerIds: [first, second]
    });
    onClose();
  };

  return (
    <Modal
      title="Create league team"
      description="Choose the two players who will stay together for the league."
      onClose={onClose}
    >
      <form onSubmit={submit} className="player-form">
        <label>First player</label>
        <select value={first} onChange={(e) => setFirst(e.target.value)}>
          {available.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>

        <label>Second player</label>
        <select value={second} onChange={(e) => setSecond(e.target.value)}>
          {available.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>

        {available.length < 2 && (
          <p className="form-error">You need at least two unassigned players to create a team.</p>
        )}

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={!valid || available.length < 2}>
            Create team
          </button>
        </div>
      </form>
    </Modal>
  );
}
