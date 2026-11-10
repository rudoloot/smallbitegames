import { validSession } from '../game/session.js';
import { createAssignments, WAREHOUSE } from '../game/config.js';
const KEY = 'factory-fit.session.v4';
export function loadSession() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) { const state = JSON.parse(stored); return validSession(state) ? state : null; }
    for (const version of [3, 2]) {
      const previous = JSON.parse(localStorage.getItem(`factory-fit.session.v${version}`));
      if (!previous || previous.version !== version || !Array.isArray(previous.layout)) continue;
      const assignments = version === 3 ? { ...previous.assignments, w5: WAREHOUSE.id } : createAssignments(previous.layout);
      const migrated = { ...previous, version: 4, assignments };
      if (validSession(migrated)) return migrated;
    }
    return null;
  }
  catch { return null; }
}
export function saveSession(state) {
  if (!validSession(state)) return false;
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
