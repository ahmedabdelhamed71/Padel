import { useState } from "react";
import Modal from "./Modal";
import { isValidMatchResult, localDateString } from "../utils";

export default function AddMatchModal({ players, onClose, onSave }) {
  const [form, setForm] = useState({
    a1: players[0]?.id ?? "",
    a2: players[1]?.id ?? "",
    b1: players[2]?.id ?? "",
    b2: players[3]?.id ?? "",
    scoreA: "",
    scoreB: ""
  });

  const playerId = (value) => players.find((player) => String(player.id) === String(value))?.id;
  const result = {
    teamA: [playerId(form.a1), playerId(form.a2)],
    teamB: [playerId(form.b1), playerId(form.b2)],
    scoreA: Number(form.scoreA),
    scoreB: Number(form.scoreB)
  };
  const valid = players.length >= 4 && form.scoreA !== "" && form.scoreB !== "" && isValidMatchResult(result, players);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const playerSelect = (key) => (
    <select aria-label={`Team ${key[0].toUpperCase()} player ${key[1]}`} value={form[key]} onChange={(e) => update(key, e.target.value)}>
      {players.map((player) => (
        <option key={player.id} value={player.id}>{player.name}</option>
      ))}
    </select>
  );

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;

    onSave({
      ...result,
      id: crypto.randomUUID(),
      date: localDateString()
    });

    onClose();
  };

  return (
    <Modal title="Add match result" description="Choose four players and enter the final padel score." onClose={onClose}>
        <form onSubmit={submit}>
          <div className="team-section">
            <strong>Team A</strong>
            <div className="two-column-form">
              {playerSelect("a1")}
              {playerSelect("a2")}
            </div>
          </div>

          <div className="team-section">
            <strong>Team B</strong>
            <div className="two-column-form">
              {playerSelect("b1")}
              {playerSelect("b2")}
            </div>
          </div>

          <div className="score-grid">
            <label>
              Team A score
              <input
                type="number"
                min="0"
                step="1"
                required
                value={form.scoreA}
                onChange={(e) => update("scoreA", e.target.value)}
                placeholder="2"
              />
            </label>
            <label>
              Team B score
              <input
                type="number"
                min="0"
                step="1"
                required
                value={form.scoreB}
                onChange={(e) => update("scoreB", e.target.value)}
                placeholder="1"
              />
            </label>
          </div>

          {players.length < 4 && (
            <p className="form-error" role="alert">Add at least 4 players before adding a match.</p>
          )}
          {players.length >= 4 && !valid && form.scoreA !== "" && form.scoreB !== "" && (
            <p className="form-error" role="alert">Use 4 different players and different, non-negative whole-number scores.</p>
          )}

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary" disabled={!valid}>Save result</button>
          </div>
        </form>
    </Modal>
  );
}
