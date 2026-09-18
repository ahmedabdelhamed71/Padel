import Modal from "./Modal";

export default function GenerateLeagueMatchesModal({
  teamCount,
  onClose,
  onGenerate
}) {
  const singlePerTeam = Math.max(0, teamCount - 1);
  const doublePerTeam = singlePerTeam * 2;
  const singleTotal = (teamCount * singlePerTeam) / 2;
  const doubleTotal = singleTotal * 2;

  return (
    <Modal
      title="Generate league matches"
      description="Choose how many times every team should face the other teams."
      onClose={onClose}
    >
      <div className="generate-format-options">
        <button
          type="button"
          className="generate-format-option"
          onClick={() => onGenerate("single")}
        >
          <strong>Single round</strong>
          <span>Each team plays every other team once.</span>
          <small>
            {singlePerTeam} matches per team · {singleTotal} total
          </small>
        </button>

        <button
          type="button"
          className="generate-format-option"
          onClick={() => onGenerate("double")}
        >
          <strong>Home & away</strong>
          <span>Each team plays every other team twice.</span>
          <small>
            {doublePerTeam} matches per team · {doubleTotal} total
          </small>
        </button>
      </div>

      <div className="modal-actions generate-format-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
