// Velvet Curfew — Guard Patrol, Suspicion, Coin-Lure Investigation & Recovery AI

import { GUARD_TYPES } from './levels.js';
import { angleDiff, computeVisionPolygon, hasLineOfSight, normalizeAngle } from './vision.js';

export function createGuards(wing, geom) {
  return wing.guards.map((g, idx) => {
    const spec = GUARD_TYPES[g.type] || GUARD_TYPES.warden;
    const guard = {
      id: idx,
      type: g.type,
      spec,
      x: g.x,
      y: g.y,
      r: 11,
      angle: g.angle ?? 0,
      state: 'PATROL', // PATROL | SUSPICIOUS | ALERT | SEARCH | RETURN
      suspicion: 0,
      peakSuspicion: 0,
      stateTimer: 0,
      waypoints: g.waypoints.map((w) => ({ x: w.x, y: w.y })),
      wpIndex: 0,
      investigateTarget: null,
      fromLure: false,
      searchDir: 1,
      hitCooldown: 0,
      visionPoly: [],
    };
    guard.visionPoly = computeVisionPolygon(guard.x, guard.y, guard.angle, spec.fov, spec.visionRange, geom, []);
    return guard;
  });
}

function moveWithSlide(entity, dx, dy, obstacles) {
  const tryAxis = (nx, ny) => {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const cx = Math.max(o.x, Math.min(nx, o.x + o.w));
      const cy = Math.max(o.y, Math.min(ny, o.y + o.h));
      const distSq = (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy);
      if (distSq < entity.r * entity.r) return false;
    }
    return true;
  };
  if (tryAxis(entity.x + dx, entity.y + dy)) {
    entity.x += dx;
    entity.y += dy;
    return true;
  }
  let moved = false;
  if (tryAxis(entity.x + dx, entity.y)) { entity.x += dx; moved = true; }
  if (tryAxis(entity.x, entity.y + dy)) { entity.y += dy; moved = true; }
  return moved;
}

function turnToward(current, target, maxStep) {
  const diff = angleDiff(target, current);
  if (Math.abs(diff) <= maxStep) return normalizeAngle(target);
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}

export function alertGuardsToSound(state, x, y, radius, isLure, sound) {
  let attracted = 0;
  for (const g of state.guards) {
    const effRadius = radius * g.spec.hearMult;
    const dist = Math.hypot(g.x - x, g.y - y);
    if (dist > effRadius) continue;
    if (g.state === 'ALERT') continue;
    g.investigateTarget = { x, y };
    g.fromLure = Boolean(isLure);
    g.state = 'SUSPICIOUS';
    g.stateTimer = (isLure ? 3.4 : 2.1) + (isLure ? state.mods.lureHoldBonus : 0);
    g.suspicion = Math.max(g.suspicion, isLure ? 0.42 : 0.34);
    g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
    attracted++;
  }
  if (attracted > 0 && sound) sound.suspicionSting();
  return attracted;
}

export function updateGuards(state, dt, sound, onPlayerHit, onToast) {
  const p = state.player;
  const obs = state.wing.obstacles;
  let maxSuspicion = 0;
  let anyAlert = false;

  for (const g of state.guards) {
    if (g.hitCooldown > 0) g.hitCooldown = Math.max(0, g.hitCooldown - dt);

    // 1. Check visual detection of infiltrator
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const dist = Math.hypot(dx, dy);
    const angToPlayer = Math.atan2(dy, dx);
    const relAng = Math.abs(angleDiff(angToPlayer, g.angle));

    const effectiveRange = g.spec.visionRange * (p.inShadow && p.crouched ? 0.54 : p.inShadow ? 0.72 : p.inLight ? 1.12 : 0.94);
    const inCone = dist < effectiveRange && relAng <= g.spec.fov * 0.5;
    const closeBump = dist < 24 && !p.inSmoke;
    const canSee = (inCone || closeBump) && !p.inSmoke && hasLineOfSight(g.x, g.y, p.x, p.y, state.geom, state.smokesActive);

    if (canSee) {
      const distFactor = Math.max(0.35, 1.35 - dist / effectiveRange);
      const lightFactor = p.inLight ? 1.45 * state.mods.lightPenaltyMult : p.inShadow ? 0.42 : 0.95;
      const crouchFactor = p.crouched ? 0.72 : 1.0;
      const gain = g.spec.suspicionRate * distFactor * lightFactor * crouchFactor * state.mods.suspicionMult * dt;
      const prev = g.suspicion;
      g.suspicion = Math.min(1, g.suspicion + gain);
      g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
      g.investigateTarget = { x: p.x, y: p.y };
      g.fromLure = false;

      if (prev < 0.25 && g.suspicion >= 0.25 && g.state === 'PATROL') {
        g.state = 'SUSPICIOUS';
        g.stateTimer = 2.6;
        if (sound) sound.suspicionSting();
      }
      if (g.suspicion >= 1 && g.state !== 'ALERT') {
        g.state = 'ALERT';
        g.stateTimer = 4.2;
        state.alerts += 1;
        state.wingAlerts += 1;
        if (sound) sound.alertSiren();
        if (onToast) onToast(`${g.spec.name.toUpperCase()} RAISED ALERT!`);
      }
    } else {
      // Suspicion drains when infiltrator breaks sightline
      const drainRate = (g.state === 'ALERT' ? 0.16 : 0.24) * state.mods.recoveryMult;
      if (g.suspicion > 0) {
        g.suspicion = Math.max(0, g.suspicion - drainRate * dt);
      }
    }

    // 2. State machine movement
    if (g.state === 'ALERT') {
      anyAlert = true;
      const tgt = g.investigateTarget || { x: p.x, y: p.y };
      const tx = tgt.x - g.x;
      const ty = tgt.y - g.y;
      const td = Math.hypot(tx, ty);
      if (td > 6) {
        const want = Math.atan2(ty, tx);
        g.angle = turnToward(g.angle, want, 6.2 * dt);
        const step = g.spec.chaseSpeed * dt;
        moveWithSlide(g, (tx / td) * step, (ty / td) * step, obs);
      }
      if (dist < g.r + p.r + 4 && g.hitCooldown <= 0) {
        g.hitCooldown = 1.6;
        if (onPlayerHit) onPlayerHit(g);
      }
      if (!canSee) {
        g.stateTimer -= dt;
        if (g.stateTimer <= 0) {
          g.state = 'SEARCH';
          g.stateTimer = 2.6;
          g.suspicion = Math.min(g.suspicion, 0.7);
        }
      } else {
        g.stateTimer = 3.8;
      }
    } else if (g.state === 'SUSPICIOUS') {
      if (g.investigateTarget) {
        const tx = g.investigateTarget.x - g.x;
        const ty = g.investigateTarget.y - g.y;
        const td = Math.hypot(tx, ty);
        const want = Math.atan2(ty, tx);
        g.angle = turnToward(g.angle, want, 3.8 * dt);
        if (td > 18) {
          const step = g.spec.speed * 0.92 * dt;
          moveWithSlide(g, (tx / td) * step, (ty / td) * step, obs);
        } else {
          g.state = 'SEARCH';
          g.stateTimer = Math.max(1.8, g.stateTimer);
          g.searchDir = Math.random() < 0.5 ? 1 : -1;
        }
      } else {
        g.state = 'SEARCH';
        g.stateTimer = 2.0;
      }
    } else if (g.state === 'SEARCH') {
      g.angle = normalizeAngle(g.angle + g.searchDir * 1.45 * dt);
      g.stateTimer -= dt;
      if (g.stateTimer <= 0) {
        if (g.peakSuspicion >= 0.4 && state.wingAlerts === 0) {
          state.recoveries += 1;
          state.score += Math.round(150 * state.mods.scoreMult);
          if (state.mods.recoveryBurst) p.sprintTimer = 2.4;
          if (sound) sound.recoveryChime();
          if (onToast) onToast('NEAR-MISS RECOVERY · +150 GHOST BONUS');
        }
        if (g.fromLure && state.mods.coinRefund && state.coins < state.maxCoins) {
          state.coins += 1;
        }
        g.peakSuspicion = 0;
        g.fromLure = false;
        g.investigateTarget = null;
        g.state = 'PATROL';
      }
    } else {
      // PATROL waypoints
      const wp = g.waypoints[g.wpIndex];
      const tx = wp.x - g.x;
      const ty = wp.y - g.y;
      const td = Math.hypot(tx, ty);
      if (td < 8) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      } else {
        const want = Math.atan2(ty, tx);
        g.angle = turnToward(g.angle, want, 3.4 * dt);
        const step = g.spec.speed * dt;
        moveWithSlide(g, (tx / td) * step, (ty / td) * step, obs);
      }
    }

    // 3. Recompute crisp occluded raycast vision cone
    g.visionPoly = computeVisionPolygon(
      g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, state.geom, state.smokesActive
    );
    maxSuspicion = Math.max(maxSuspicion, g.suspicion);
  }

  if (maxSuspicion > 0.35 && sound) {
    sound.heartbeat(state.time, anyAlert ? 1 : maxSuspicion);
  }
  state.maxSuspicion = maxSuspicion;
  state.anyAlert = anyAlert;
}
