import { useState } from "react";
import Modal from "./Modal";

export default function LeagueResultModal({ match, teams, players, onSave, onClose }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? "");
  const [scoreB, setScoreB] = useState(match.scoreB ?? "");

  const playerName = (id) => players.find((player) => player.id === id)?.name ?? "Unknown";
  const teamName = (teamId) => {
    const team = teams.find((item) => item.id === teamId);
    return team ? team.playerIds.map(playerName).join(" / ") : "Unknown";
  };

  const a = teamName(match.teamAId);
  const b = teamName(match.teamBId);
  const valid = scoreA !== "" && scoreB !== "" && Number(scoreA) !== Number(scoreB);

  const submit = (event) => {
    event.preventDefault();
    if (!valid) return;

    onSave({
      ...match,
      scoreA: Number(scoreA),
      scoreB: Number(scoreB),
      status: "played"
    });
    onClose();
  };

  return (
    <Modal title="Add league result" description={`${a} vs ${b}`} onClose={onClose}>
      <form onSubmit={submit} className="player-form">
        <label>{a} score</label>
        <input type="number" min="0" step="1" value={scoreA} onChange={(e) => setScoreA(e.target.value)} />

        <label>{b} score</label>
        <input type="number" min="0" step="1" value={scoreB} onChange={(e) => setScoreB(e.target.value)} />

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={!valid}>Save result</button>
        </div>
      </form>
    </Modal>
  );
}
