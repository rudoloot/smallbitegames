import { terrainScroll, ROAD_SCROLL_FACTOR } from './terrain.js?v=92bc1fbf2287';

export const fireworkLifetime = weapon => weapon === 'missile' ? 4.5 : 3.8;
export const fireworkForwardDistance = (terrain, from, to) => Math.max(0, terrainScroll(terrain, to) - terrainScroll(terrain, from)) * ROAD_SCROLL_FACTOR;

// The camera advances along the road: every burst moves toward it together,
// independently of each spark's own spread, fall and reflected velocity.
export function advanceFirework(effect, dt, height, forwardDistance = 0) {
  if (effect.fireworkSpark) advanceFireworkSpark(effect, dt, height, forwardDistance);
  else {
    effect.position.addScaledVector(effect.velocity, dt);
    effect.position.z += forwardDistance;
  }
  effect.forwardDistance = (effect.forwardDistance ?? 0) + forwardDistance;
}

// Sparks use the actual road height and its normal, including crests and dips.
export function advanceFireworkSpark(spark, dt, height, forwardDistance = 0) {
  const forwardSpeed = dt > 0 ? forwardDistance / dt : 0;
  let remaining = dt;
  while (remaining > 1e-9) {
    const step = Math.min(remaining,1/120), p = spark.position, v = spark.velocity;
    p.x += v.x * step; p.z += (v.z + forwardSpeed) * step;
    p.y += v.y * step - spark.gravity * step * step / 2; v.y -= spark.gravity * step;
    const floor = height(p.z) + .055;
    if (Math.abs(p.x) < 2.44 && p.z > -82 && p.z < 18 && p.y < floor) {
      if (!spark.bounce) { spark.age = spark.life; return; }
      const slope = (height(p.z+.05)-height(p.z-.05))/.1;
      const length = Math.hypot(1,slope), ny = 1/length, nz = -slope/length;
      const inward = v.y*ny+v.z*nz;
      if (inward < 0) {
        v.y -= 1.65*inward*ny; v.z -= 1.65*inward*nz;
        v.y = Math.max(3,v.y); v.z = Math.max(4,Math.abs(v.z)*.7+2);
        spark.bounces = (spark.bounces ?? 0)+1;
        spark.life = Math.min(spark.life,spark.age+.85);
      }
      p.y = floor+.005;
    }
    remaining -= step;
  }
}
