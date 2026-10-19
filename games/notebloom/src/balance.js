export const BOSS_BALANCE = Object.freeze({ version: 8, notesPerUnit: 30,
  healthPerUnit: 2000, healthMultiplier: .7 });

export function estimateBossHealth(chart) {
  const noteCount = chart.events.filter(event => event.type === 'note').length;
  return { ...BOSS_BALANCE, noteCount,
    bossMax: noteCount / BOSS_BALANCE.notesPerUnit * BOSS_BALANCE.healthPerUnit * BOSS_BALANCE.healthMultiplier };
}
