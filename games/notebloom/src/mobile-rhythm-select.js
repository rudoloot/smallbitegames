import {RHYTHM_VERSION} from './rhythm.js?v=67d77c6fbbe3';

export function modelBeatPeaks(logits) {
  const peaks = [];
  for (let frame = 0; frame < logits.length; frame++) {
    if (!(logits[frame] > 0)) continue;
    let highest = true;
    for (let i = Math.max(0, frame - 3); i <= Math.min(logits.length - 1, frame + 3); i++) {
      if (logits[i] > logits[frame] || (i < frame && logits[i] === logits[frame])) { highest = false; break; }
    }
    if (highest) peaks.push({time:frame * .02, strength:1 / (1 + Math.exp(-logits[frame]))});
  }
  return peaks;
}

const median = values => values.length ? values.toSorted((a,b)=>a-b)[Math.floor(values.length / 2)] : .5;

// This is beat tracking + measured full-mix attacks, not neural drum isolation.
// No note is created solely because the network predicts a beat during a rest.
export function buildMobileRhythm(duration, attacks, beatLogits, downbeatLogits) {
  const beats = modelBeatPeaks(beatLogits), downbeats = modelBeatPeaks(downbeatLogits);
  const intervals = beats.slice(1).map((beat, i)=>beat.time-beats[i].time).filter(gap=>gap>=.25&&gap<=1.5);
  const beat = median(intervals), sections = [], candidates = [];
  for (let start = 0; start < duration; start += 8) {
    const end = Math.min(duration, start + 8), local = attacks.filter(a=>a.time>=start&&a.time<end);
    const localBeats = beats.filter(b=>b.time>=start&&b.time<end);
    const supported = local.filter(a => localBeats.some(b=>Math.abs(a.time-b.time)<.09));
    // Require bass or noisy broadband percussion as well as confident beats.
    // Piano/string music keeps its measured melody attacks even with a tempo.
    const percussive = supported.filter(a=>(a.low>.09&&a.decay<.6)||a.noisy);
    const drums = localBeats.length >= (end-start) * .7 && percussive.length >= Math.max(3, supported.length * .4);
    const localIntervals = localBeats.slice(1).map((b,i)=>b.time-localBeats[i].time).filter(gap=>gap>=.25&&gap<=1.5);
    sections.push({start,end,mode:drums?'drums':'melody',beat:localIntervals.length?median(localIntervals):beat});
    for (const attack of local) {
      const nearBeat = beats.find(b=>Math.abs(b.time-attack.time)<.09);
      const accent = Boolean(downbeats.some(b=>Math.abs(b.time-attack.time)<.1));
      const kind = !drums ? 'melody' : attack.low > .09 ? 'kick' : attack.top > .5 ? 'hat' : 'snare';
      candidates.push({time:attack.time,strength:attack.strength * (drums ? nearBeat ? 1.2 : .55 : 1),kind,accent});
    }
  }
  return {version:RHYTHM_VERSION,model:'beat-this-small0-mobile-v2',duration,beat,sections,candidates,
    analysis:{location:'device',provider:'wasm',beatCount:beats.length,measuredAttackCount:attacks.length,maxWindowFrames:750}};
}
