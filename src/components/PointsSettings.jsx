import { useState } from "react";
import { isNonNegativeInteger } from "../utils";

export default function PointsSettings({ scoring, setScoring }) {
  const [draft, setDraft] = useState({ win: String(scoring.win), loss: String(scoring.loss), play: String(scoring.play ?? 1) });
  const [saved, setSaved] = useState(false);
  const valid = (value) => value.trim() !== "" && isNonNegativeInteger(Number(value));
  const canSave = valid(draft.win) && valid(draft.loss) && valid(draft.play);

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    setScoring({ win: Number(draft.win), loss: Number(draft.loss), play: Number(draft.play) });
    setSaved(true);
  };

  return (
    <form onSubmit={submit}>
      <div className="settings-grid">
        {[["win", "Points for a win"], ["loss", "Points for a loss"], ["play", "Points for playing a match"]].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min="0"
              step="1"
              required
              value={draft[key]}
              onChange={(event) => update(key, event.target.value)}
              aria-invalid={!valid(draft[key])}
              aria-describedby={!canSave ? "scoring-error" : undefined}
            />
          </label>
        ))}
      </div>
      <div className="settings-actions">
        {!canSave && <p className="form-error" id="scoring-error">Enter a whole number of zero or more for each value.</p>}
        <button className="button primary" type="submit" disabled={!canSave}>Save points</button>
        {saved && <span role="status">Points updated.</span>}
      </div>
    </form>
  );
}
