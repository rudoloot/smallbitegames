import { restoreLayoutVariants } from '../game/restore-variants.js';
import { STAGE } from '../game/config.js';
import { validSession } from '../game/session.js';
const KEY = 'factory-fit.puzzle.v5';
export function loadSession(stage = STAGE) { try { const state = JSON.parse(localStorage.getItem(`${KEY}.${stage.id}${stage.revision ? '.'+stage.revision : ''}`)); if (state?.version === 5 && state.stageId === stage.id && state.assignments && stage.workers.length === 20 && Object.keys(state.assignments).length === 4 && ['w1','w2','w3','w4'].every(key => Object.hasOwn(state.assignments, key))) {
  for (const worker of stage.workers) if (!Object.hasOwn(state.assignments, worker.key)) state.assignments[worker.key] = null;
} if (!state) return null;
const restored=restoreLayoutVariants(state,stage); return validSession(restored, stage) ? restored : null; } catch { return null; } }
export function saveSession(state, stage = STAGE) { if (!validSession(state, stage)) return false; try { localStorage.setItem(`${KEY}.${stage.id}${stage.revision ? '.'+stage.revision : ''}`, JSON.stringify(state)); return true; } catch { return false; } }
export function loadProgress() { try { const p = JSON.parse(localStorage.getItem(`${KEY}.progress`)); return p?.cleared?.filter(id => typeof id === 'string') ?? []; } catch { return []; } }
export function saveProgress(cleared) { try { localStorage.setItem(`${KEY}.progress`, JSON.stringify({ cleared: [...new Set(cleared)] })); return true; } catch { return false; } }
