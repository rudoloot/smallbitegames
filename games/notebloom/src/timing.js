import { terrainSlope, MAX_TERRAIN_SLOPE } from './terrain.js?v=5eac88f2d33d';

// AudioContext.currentTime is the rendering clock, ahead of what the listener
// hears. The output timestamp maps the device's audible frame to performance.now.
export function audibleContextTime(context, now = performance.now()) {
  const renderTime = context.currentTime;
  if (context.state !== 'suspended' && context.state !== 'closed' && context.getOutputTimestamp) {
    const stamp = context.getOutputTimestamp();
    if (Number.isFinite(stamp.contextTime) && stamp.contextTime >= 0 &&
        Number.isFinite(stamp.performanceTime) && stamp.performanceTime > 0) {
      const outputTime = stamp.contextTime + Math.max(0, now - stamp.performanceTime) / 1000;
      return Math.max(0, Math.min(renderTime, outputTime));
    }
  }
  // Older browsers expose processing/device delays without the clock mapping.
  const latency = Math.max(0, context.baseLatency || 0) + Math.max(0, context.outputLatency || 0);
  return Math.max(0, renderTime - latency);
}

export const COLLECTION_Z = 3.25;
export const NOTE_SPEED = 42;
export const NOTE_PREVIEW = 1;
export const NOTE_CONTACT_HOLD = .05;
export const MIN_NOTE_SPEED_FACTOR = .6;
export const noteSpeed = slope => NOTE_SPEED * (1 - .4 * Math.max(-1, Math.min(1, slope / MAX_TERRAIN_SLOPE)));

// Integrate speed from now to the measured beat. This changes travel speed and
// preview duration without ever moving the audible judgment timestamp.
export function noteTravelDistance(profile, from, to) {
  if (to <= from) return 0;
  if (!profile?.slopes?.length || !(profile.step > 0)) return (to - from) * NOTE_SPEED;
  let cursor = from, distance = 0;
  while (cursor < to) {
    const index = Math.floor(Math.max(0, cursor) / profile.step);
    let end = index >= profile.slopes.length - 1 ? to : Math.min(to, (index + 1) * profile.step);
    if (end <= cursor) end = Math.min(to, cursor + profile.step);
    distance += (noteSpeed(terrainSlope(profile, cursor)) + noteSpeed(terrainSlope(profile, end))) / 2 * (end - cursor);
    cursor = end;
  }
  return distance;
}

// Include just-judged notes independently of GameState.index: otherwise the
// first frame reaching the beat deletes the note before it touches the line.
export function* visibleNotes(events, time, terrain) {
  let low = 0, high = events.length;
  const oldest = time - NOTE_CONTACT_HOLD;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (events[mid].time <= oldest) low = mid + 1;
    else high = mid;
  }
  for (let i = low; i < events.length; i++) {
    const event = events[i], until = event.time - time;
    if (until > NOTE_PREVIEW / MIN_NOTE_SPEED_FACTOR + 1e-9) break;
    const distance = noteTravelDistance(terrain, time, event.time);
    if (distance > NOTE_SPEED * NOTE_PREVIEW + 1e-9) break;
    if (event.type !== 'note') continue;
    yield { event, z: COLLECTION_Z - distance,
      scale: until >= 0 ? 1 : Math.max(0, 1 + until / NOTE_CONTACT_HOLD) };
  }
}
