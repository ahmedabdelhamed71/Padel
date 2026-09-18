import Modal from "./Modal";

export default function ClearMatchesModal({ count, onConfirm, onClose }) {
  return (
    <Modal
      title="Delete all previous matches?"
      description="Are you sure you want to delete all previous matches?"
      role="alertdialog"
      onClose={onClose}
    >
      <div className="dialog-content">
        <p>This will permanently delete {count} Friendly Group {count === 1 ? "match" : "matches"} and reset every player's points and match history.</p>
        <p>Your players, points settings and league fixtures will be kept. This cannot be undone.</p>
        <div className="modal-actions">
          <button type="button" className="button secondary" data-autofocus onClick={onClose}>Cancel</button>
          <button type="button" className="button danger" onClick={onConfirm}>Delete all matches</button>
        </div>
      </div>
    </Modal>
  );
}
