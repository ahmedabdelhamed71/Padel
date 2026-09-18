import { useState } from "react";
import Modal from "./Modal";
import { createPlayer, getPlayerNameError } from "../utils";

export default function AddLeaguePlayerModal({ players, onSave, onClose }) {
  const [name, setName] = useState("");
  const error = getPlayerNameError(name, players);

  const submit = (event) => {
    event.preventDefault();
    if (error) return;
    onSave(createPlayer(name));
    onClose();
  };

  return (
    <Modal title="Add league player" description="Add a player to the League." onClose={onClose}>
      <form onSubmit={submit} className="player-form">
        <label htmlFor="league-player-name">Player name</label>
        <input
          id="league-player-name"
          data-autofocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Ali Mahmoud"
          maxLength={60}
          autoComplete="off"
          required
        />
        {name && error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={Boolean(error)}>Save player</button>
        </div>
      </form>
    </Modal>
  );
}
