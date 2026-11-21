// Velvet Curfew — True 2D Raycast Visibility Polygon & Sightline Occlusion Engine

const EPS = 0.0008;

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleDiff(a, b) {
  return normalizeAngle(a - b);
}

// Convert solid obstacles into wall segments + corner endpoints for crisp occlusion
export function buildSegments(obstacles) {
  const segs = [];
  const corners = [];
  for (const r of obstacles) {
    const x1 = r.x;
    const y1 = r.y;
    const x2 = r.x + r.w;
    const y2 = r.y + r.h;
    segs.push([x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]);
    corners.push([x1, y1], [x2, y1], [x2, y2], [x1, y2]);
  }
  return { segs, corners };
}

// Ray (ox, oy) + t*(dx, dy) intersected with segment (ax, ay)-(bx, by)
function raySegT(ox, oy, dx, dy, ax, ay, bx, by) {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-8) return Infinity;
  const qx = ax - ox;
  const qy = ay - oy;
  const t = (qx * sy - qy * sx) / denom;
  if (t < 0) return Infinity;
  const u = (qx * dy - qy * dx) / denom;
  if (u < -1e-5 || u > 1 + 1e-5) return Infinity;
  return t;
}

// Ray intersection with circular Velvet Smoke cloud (blocks sightlines dynamically!)
function rayCircleT(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 6; // Origin inside smoke sees almost nothing
  const disc = b * b - 4 * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) * 0.5;
  return t >= 0 ? t : Infinity;
}

export function castRay(ox, oy, angle, maxDist, segs, smokes = []) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const t = raySegT(ox, oy, dx, dy, s[0], s[1], s[2], s[3]);
    if (t < best) best = t;
  }
  for (let i = 0; i < smokes.length; i++) {
    const sm = smokes[i];
    if (sm.alpha < 0.2) continue;
    const t = rayCircleT(ox, oy, dx, dy, sm.x, sm.y, sm.r * 0.88);
    if (t < best) best = t;
  }
  return { x: ox + dx * best, y: oy + dy * best, dist: best };
}

// Compute pixel-accurate vision cone polygon occluded by walls, pillars & smoke
export function computeVisionPolygon(ox, oy, facing, fov, range, geom, smokes = []) {
  const half = fov * 0.5;
  const angles = [];

  // Sample cone arc smoothly so outer curve is crisp
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    angles.push(-half + (fov * i) / steps);
  }

  // Cast twin rays (+/- EPS) to every obstacle corner within range & cone
  const rangePad = (range + 20) * (range + 20);
  const corners = geom.corners;
  for (let i = 0; i < corners.length; i++) {
    const cx = corners[i][0];
    const cy = corners[i][1];
    const vx = cx - ox;
    const vy = cy - oy;
    if (vx * vx + vy * vy > rangePad) continue;
    const rel = angleDiff(Math.atan2(vy, vx), facing);
    if (rel >= -half - 0.02 && rel <= half + 0.02) {
      angles.push(Math.max(-half, Math.min(half, rel - EPS)));
      angles.push(Math.max(-half, Math.min(half, rel)));
      angles.push(Math.max(-half, Math.min(half, rel + EPS)));
    }
  }

  // Also add tangent rays around active smoke clouds inside range
  for (let i = 0; i < smokes.length; i++) {
    const sm = smokes[i];
    if (sm.alpha < 0.2) continue;
    const vx = sm.x - ox;
    const vy = sm.y - oy;
    const d = Math.hypot(vx, vy);
    if (d > range + sm.r || d < sm.r + 2) continue;
    const base = angleDiff(Math.atan2(vy, vx), facing);
    const span = Math.asin(Math.min(0.99, (sm.r * 0.88) / d));
    for (const off of [-span - EPS, -span, 0, span, span + EPS]) {
      const a = base + off;
      if (a >= -half && a <= half) angles.push(a);
    }
  }

  angles.sort((a, b) => a - b);

  const pts = [{ x: ox, y: oy }];
  let prev = -999;
  for (let i = 0; i < angles.length; i++) {
    const rel = angles[i];
    if (rel - prev < 0.0003) continue;
    prev = rel;
    const hit = castRay(ox, oy, facing + rel, range, geom.segs, smokes);
    pts.push({ x: hit.x, y: hit.y });
  }
  return pts;
}

// Fast exact line-of-sight check from guard to infiltrator
export function hasLineOfSight(ox, oy, tx, ty, geom, smokes = []) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const angle = Math.atan2(dy, dx);
  const hit = castRay(ox, oy, angle, dist, geom.segs, smokes);
  return hit.dist >= dist - 3;
}
