/**
 * Optional backend adapter.
 *
 * The current app intentionally uses localStorage and needs no backend.
 * If a backend is added later, replace these functions with fetch/Axios calls
 * and call them from App.jsx while keeping all page/component props unchanged.
 *
 * Suggested backend shape:
 * GET/PUT /api/friendly/players
 * GET/PUT /api/friendly/matches
 * GET/PUT /api/friendly/scoring
 * GET/PUT /api/league/players
 * GET/PUT /api/league/matches
 *
 * Keeping persistence behind this module lets the UI remain unchanged.
 */
export const backendAdapter = {
  enabled: false,
  async load() {
    return null;
  },
  async save() {
    return null;
  }
};
