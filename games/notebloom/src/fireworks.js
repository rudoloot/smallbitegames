// Sparks use the actual road height and its normal, including crests and dips.
export function advanceFireworkSpark(spark, dt, height) {
  let remaining = dt;
  while (remaining > 1e-9) {
    const step = Math.min(remaining,1/120), p = spark.position, v = spark.velocity;
    p.x += v.x * step; p.z += v.z * step;
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
