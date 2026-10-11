// A deliberate upward stroke fires once. Moving down re-arms the next stroke,
// so players can keep steering without lifting their finger.
export function beginGesture(x, y) { return { x, y, peak: y, fired: false }; }
export function updateGesture(gesture, x, y, height) {
  const threshold = Math.max(32, Math.min(64, height * .065));
  if (gesture.fired) {
    gesture.peak = Math.min(gesture.peak, y);
    if (y - gesture.peak >= threshold) { gesture.y = y; gesture.x = x; gesture.fired = false; }
    return false;
  }
  if (y > gesture.y) { gesture.y = y; gesture.x = x; }
  const up = gesture.y - y;
  if (Math.abs(x - gesture.x) >= threshold && Math.abs(x - gesture.x) > up * 1.15) {
    gesture.x = x; gesture.y = y; return false;
  }
  if (up < threshold || up < Math.abs(x - gesture.x) * 1.15) return false;
  gesture.fired = true; gesture.peak = y;
  return true;
}
