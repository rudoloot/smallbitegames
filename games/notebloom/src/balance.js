export const BOSS_BALANCE = Object.freeze({ version: 3, notesPerUnit: 20, healthPerUnit: 500 });

export function estimateBossHealth(chart) {
  const noteCount = chart.events.filter(event => event.type === 'note').length;
  return { ...BOSS_BALANCE, noteCount, bossMax: noteCount / BOSS_BALANCE.notesPerUnit * BOSS_BALANCE.healthPerUnit };
}
