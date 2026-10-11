// Keep the collection point one eighth of the viewport above its bottom.
// Adjust pitch rather than the runner's world position, preserving note timing.
export function anchorPlayerCamera(camera, anchor, screenY = 7 / 8) {
  const distance = camera.position.z - anchor.z;
  const elevation = Math.atan2(anchor.y - camera.position.y, distance);
  const viewportAngle = Math.atan((1 - 2 * screenY) * Math.tan(camera.fov * Math.PI / 360));
  const pitch = elevation - viewportAngle;
  const lookZ = -10;
  camera.lookAt(anchor.x, camera.position.y + Math.tan(pitch) * (camera.position.z - lookZ), lookZ);
  camera.updateMatrixWorld(true);
}
