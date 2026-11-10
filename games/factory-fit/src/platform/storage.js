import { STAGE } from '../game/config.js';
import { validSession } from '../game/session.js';
const KEY = 'factory-fit.puzzle.v5';
export function loadSession(stage = STAGE) { try { const state = JSON.parse(localStorage.getItem(`${KEY}.${stage.id}`)); return validSession(state, stage) ? state : null; } catch { return null; } }
export function saveSession(state, stage = STAGE) { if (!validSession(state, stage)) return false; try { localStorage.setItem(`${KEY}.${stage.id}`, JSON.stringify(state)); return true; } catch { return false; } }
export function loadProgress() { try { const p = JSON.parse(localStorage.getItem(`${KEY}.progress`)); return p?.cleared?.filter(id => typeof id === 'string') ?? []; } catch { return []; } }
export function saveProgress(cleared) { try { localStorage.setItem(`${KEY}.progress`, JSON.stringify({ cleared: [...new Set(cleared)] })); return true; } catch { return false; } }
