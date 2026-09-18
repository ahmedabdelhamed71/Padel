import { useState } from "react";
import Modal from "./Modal";

export default function AddLeagueMatchModal({ teams, players, onSave, onClose }) {
  const [a, setA] = useState(teams[0]?.id ?? "");
  const [b, setB] = useState(teams[1]?.id ?? "");
  const [date, setDate] = useState("");
  const valid = a && b && a !== b;

  const playerName = (id) => players.find((player) => player.id === id)?.name ?? "Unknown";
  const teamName = (team) => team.playerIds.map(playerName).join(" / ");

  const submit = (event) => {
    event.preventDefault();
    if (!valid) return;

    const teamA = teams.find((team) => team.id === a);
    const teamB = teams.find((team) => team.id === b);

    onSave({
      id: globalThis.crypto.randomUUID(),
      source: "manual",
      round: null,
      teamAId: a,
      teamBId: b,
      teamAPlayerIds: [...(teamA?.playerIds ?? [])],
      teamBPlayerIds: [...(teamB?.playerIds ?? [])],
      scoreA: null,
      scoreB: null,
      status: "scheduled",
      date
    });
    onClose();
  };

  return (
    <Modal title="Add league match" description="Add an extra team match outside the generated schedule." onClose={onClose}>
      <form onSubmit={submit} className="player-form">
        <label>Team A</label>
        <select value={a} onChange={(e) => setA(e.target.value)}>
          {teams.map((team) => <option key={team.id} value={team.id}>{teamName(team)}</option>)}
        </select>

        <label>Team B</label>
        <select value={b} onChange={(e) => setB(e.target.value)}>
          {teams.map((team) => <option key={team.id} value={team.id}>{teamName(team)}</option>)}
        </select>

        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={!valid}>Add match</button>
        </div>
      </form>
    </Modal>
  );
}
