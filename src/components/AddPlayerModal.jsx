import { useState } from "react";
import Modal from "./Modal";
import { createPlayer, getPlayerNameError } from "../utils";

export default function AddPlayerModal({ players, onSave, onClose }) {
  const [name, setName] = useState("");
  const error = getPlayerNameError(name, players);
  const showError = name !== "" && Boolean(error);

  const submit = (event) => {
    event.preventDefault();
    if (error) return;
    onSave(createPlayer(name));
    onClose();
  };

  return (
    <Modal title="Add player" description="Add a player to your Friendly Group matches and standings." onClose={onClose}>
      <form onSubmit={submit} className="player-form">
        <label htmlFor="player-name">Player name</label>
        <input
          id="player-name"
          name="playerName"
          data-autofocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Ali Mahmoud"
          maxLength={60}
          autoComplete="off"
          required
          aria-invalid={showError}
          aria-describedby={showError ? "player-name-error" : undefined}
        />
        {showError && <p className="form-error" id="player-name-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={Boolean(error)}>Save player</button>
        </div>
      </form>
    </Modal>
  );
}
