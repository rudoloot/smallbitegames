export const BOSS_BALANCE = Object.freeze({ version: 4, notesPerUnit: 20,
  healthPerUnit: Object.freeze({ hard: 1000, easy: 600 }) });

export function estimateBossHealth(chart, difficulty = chart.difficulty ?? 'easy') {
  const noteCount = chart.events.filter(event => event.type === 'note').length;
  const healthPerUnit = BOSS_BALANCE.healthPerUnit[difficulty === 'easy' ? 'easy' : 'hard'];
  return { ...BOSS_BALANCE, healthPerUnit, noteCount, bossMax: noteCount / BOSS_BALANCE.notesPerUnit * healthPerUnit };
}
