export const RHYTHM_VERSION = 2;

// Choose from measured attacks only. Never invent evenly spaced notes or snap
// rubato playing to one global BPM. The default (legacy key 'easy') keeps
// the strong base plus half of Hard's extra attacks, spread across the song.
export function selectRhythmNotes(rhythm, difficulty = 'easy') {
  const hard = difficulty !== 'easy';
  const sections = rhythm.sections;
  const candidates = rhythm.candidates.filter(c => {
    if (!Number.isFinite(c.time) || c.time < 0 || c.time > rhythm.duration || !(c.strength > 0)) return false;
    const section = sections.find(s => c.time >= s.start && c.time < s.end);
    return section?.mode === 'drums' ? c.kind !== 'melody' : c.kind === 'melody';
  });
  const chosen = [];
  const settings = (candidate, extra) => {
    const section = sections.find(s => candidate.time >= s.start && candidate.time < s.end);
    const melodic = section?.mode !== 'drums';
    const beat = Math.max(.35, Math.min(.85, section?.beat || rhythm.beat || .5));
    return { interval: melodic ? (extra ? .38 : .7) : Math.max(extra ? .28 : .45, beat * (extra ? .6 : 1)),
      limit: extra ? (melodic ? 20 : 26) : (melodic ? 12 : 18), threshold: extra ? .14 : .3 };
  };
  const rank = candidate => candidate.strength * (candidate.kind === 'hat' ? .35 : 1) * (candidate.accent ? 1.25 : 1);
  const ordered = candidates.toSorted((a, b) => rank(b) - rank(a) || a.time - b.time);
  function add(extra) {
    for (const candidate of ordered) {
      const config = settings(candidate, extra);
      if (rank(candidate) < config.threshold) continue;
      // Merge chords/flams; a sparse melody must not acquire a dense drum row.
      if (chosen.some(other => Math.abs(other.time - candidate.time) < Math.max(config.interval, settings(other, extra).interval) - 1e-9)) continue;
      // Bound every rolling ten-second window, not just fixed buckets.
      const nearby = chosen.filter(other => Math.abs(other.time - candidate.time) < 10);
      const times = [...nearby.map(c => c.time), candidate.time].sort((a,b)=>a-b);
      let right = 0, crowded = false;
      for (let left = 0; left < times.length; left++) {
        while (right < times.length && times[right] < times[left] + 10 - 1e-9) right++;
        if (right - left > config.limit) { crowded = true; break; }
      }
      if (!crowded) chosen.push(candidate);
    }
  }
  add(false);
  const base = new Set(chosen);
  add(true);
  let extraIndex = 0;
  return chosen.sort((a,b)=>a.time-b.time)
    .filter(candidate => hard || base.has(candidate) || extraIndex++ % 2 === 0)
    .map(candidate=>candidate.time);
}

export function validateRhythm(rhythm, duration) {
  if (rhythm?.version !== RHYTHM_VERSION || !Number.isFinite(rhythm.duration) || Math.abs(rhythm.duration - duration) > .12 ||
      !Array.isArray(rhythm.candidates) || !Array.isArray(rhythm.sections) || !rhythm.sections.length) throw new Error('음표 분석 결과를 사용할 수 없어요. 다시 분석해 주세요.');
  if (rhythm.candidates.some(c => !Number.isFinite(c.time) || c.time < 0 || c.time > rhythm.duration || !Number.isFinite(c.strength) || c.strength < 0 || !['kick','snare','hat','melody'].includes(c.kind)) ||
      rhythm.sections.some(s => !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.end <= s.start || !['drums','melody'].includes(s.mode))) throw new Error('음표 분석 데이터가 올바르지 않아요.');
  return rhythm;
}
