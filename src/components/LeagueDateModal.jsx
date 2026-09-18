import { useState } from "react";
import Modal from "./Modal";

export default function LeagueDateModal({ match, onSave, onClose }) {
  const [date, setDate] = useState(match.date ?? "");

  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...match,
      date
    });
    onClose();
  };

  return (
    <Modal
      title="Set match date"
      description="Choose the date manually for this league match."
      onClose={onClose}
    >
      <form onSubmit={submit} className="player-form">
        <label>Match date</label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save date
          </button>
        </div>
      </form>
    </Modal>
  );
}
