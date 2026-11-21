// Velvet Curfew v2 — Guard AI, Brass-Eye Cameras, Laser Tripwires & Alarm Rally Network

import { GUARD_TYPES } from './levels.js';
import { angleDiff, computeVisionPolygon, hasLineOfSight, normalizeAngle, pointToSegmentDist } from './vision.js';

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
      state: 'PATROL', // PATROL | SUSPICIOUS | ALARM | SEARCHING
      suspicion: 0,
      peakSuspicion: 0,
      stateTimer: 0,
      waypoints: g.waypoints.map((w) => ({ x: w.x, y: w.y })),
      wpIndex: 0,
      investigateTarget: null,
      lurePos: null,
      rallyTarget: null,
      fromLure: false,
      searchDir: 1,
      hitCooldown: 0,
      visionPoly: [],
    };
    guard.visionPoly = computeVisionPolygon(guard.x, guard.y, guard.angle, spec.fov, spec.visionRange, geom, []);
    return guard;
  });
}

export function createCameras(wing, geom) {
  return (wing.cameras || []).map((c, idx) => {
    const cam = {
      id: idx,
      x: c.x,
      y: c.y,
      baseAngle: c.baseAngle,
      angle: c.baseAngle,
      sweep: c.sweep,
      speed: c.speed,
      range: c.range,
      fov: c.fov,
      alerting: false,
      visionPoly: [],
    };
    cam.visionPoly = computeVisionPolygon(cam.x, cam.y, cam.angle, cam.fov, cam.range, geom, []);
    return cam;
  });
}

export function createTripwires(wing) {
  return (wing.tripwires || []).map((t, idx) => ({
    id: idx,
    x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2,
    period: t.period || 4.4,
    duty: t.duty || 0.62,
    phase: t.phase || 0,
    active: true,
    cooldown: 0,
  }));
}

function moveWithSlide(entity, dx, dy, obstacles) {
  const ok = (nx, ny) => {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.kind === 'low') continue; // guards can skirt low planters slightly cleanly
      const cx = Math.max(o.x, Math.min(nx, o.x + o.w));
      const cy = Math.max(o.y, Math.min(ny, o.y + o.h));
      if ((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < entity.r * entity.r) return false;
    }
    return true;
  };
  if (ok(entity.x + dx, entity.y + dy)) { entity.x += dx; entity.y += dy; return true; }
  let moved = false;
  if (ok(entity.x + dx, entity.y)) { entity.x += dx; moved = true; }
  if (ok(entity.x, entity.y + dy)) { entity.y += dy; moved = true; }
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
    if (g.state === 'ALARM') continue;
    const dist = Math.hypot(g.x - x, g.y - y);
    if (dist > radius * g.spec.hearMult) continue;
    g.investigateTarget = { x, y };
    g.lurePos = isLure ? { x, y } : null;
    g.fromLure = Boolean(isLure);
    g.state = 'SUSPICIOUS';
    g.stateTimer = (isLure ? 3.5 : 2.2) + (isLure ? state.mods.lureHoldBonus : 0);
    g.suspicion = Math.max(g.suspicion, isLure ? 0.55 : 0.36);
    g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
    attracted++;
  }
  if (attracted > 0 && sound) sound.suspicionSting();
  return attracted;
}

export function triggerAlarmAt(state, sourceGuard, x, y, sound, onToast) {
  state.alerts += 1;
  state.wingAlerts += 1;
  state.alarmLevel = Math.min(3, state.alarmLevel + 1);
  state.lastSeen = { x, y };
  state.alarmOrigin = { x, y };
  state.alarmLinks = [];

  for (const g of state.guards) {
    if (sourceGuard && g.id === sourceGuard.id) {
      g.state = 'ALARM';
      g.suspicion = 1;
      g.stateTimer = 4.2;
      g.investigateTarget = { x, y };
      continue;
    }
    if (Math.hypot(g.x - x, g.y - y) < 380) {
      g.state = 'SUSPICIOUS';
      g.suspicion = Math.max(g.suspicion, 0.72);
      g.peakSuspicion = Math.max(g.peakSuspicion, 0.72);
      g.investigateTarget = { x, y };
      g.rallyTarget = { x, y };
      g.stateTimer = 4.0;
      state.alarmLinks.push({ x1: x, y1: y, x2: g.x, y2: g.y });
    }
  }
  if (sound) sound.alertSiren();
  if (onToast) onToast('SPOTTED! Break line of sight or drop Smoke [Q].', true);
  if (state.alarmLevel >= 3) {
    state.lockdown = true;
  }
}

export function updateSecurity(state, dt, sound, onPlayerHit, onToast) {
  const p = state.player;
  const obs = state.wing.obstacles;
  const concealedByCover = p.inSmoke || (p.inLowCover && p.crouched);

  // 1. Update Brass-Eye Security Cameras
  for (const cam of state.cameras) {
    cam.angle = cam.baseAngle + Math.sin(state.time * cam.speed + cam.id * 1.3) * cam.sweep;
    cam.visionPoly = computeVisionPolygon(cam.x, cam.y, cam.angle, cam.fov, cam.range, state.geom, state.smokesActive);
    const dx = p.x - cam.x, dy = p.y - cam.y;
    const dist = Math.hypot(dx, dy);
    const inCone = dist < cam.range && Math.abs(angleDiff(Math.atan2(dy, dx), cam.angle)) <= cam.fov * 0.5;
    cam.alerting = inCone && !concealedByCover && hasLineOfSight(cam.x, cam.y, p.x, p.y, state.geom, state.smokesActive);
    if (cam.alerting && state.alarmCooldown <= 0) {
      state.alarmCooldown = 3.2;
      triggerAlarmAt(state, null, p.x, p.y, sound, onToast);
    }
  }

  // 2. Update Pulsing Crimson Laser Tripwires
  for (const tw of state.tripwires) {
    if (tw.cooldown > 0) tw.cooldown = Math.max(0, tw.cooldown - dt);
    const cycle = ((state.time + tw.phase) % tw.period) / tw.period;
    tw.active = cycle < tw.duty;
    if (tw.active && tw.cooldown <= 0 && pointToSegmentDist(p.x, p.y, tw.x1, tw.y1, tw.x2, tw.y2) < p.r + 3) {
      tw.cooldown = 3.0;
      triggerAlarmAt(state, null, p.x, p.y, sound, onToast);
    }
  }
  if (state.alarmCooldown > 0) state.alarmCooldown = Math.max(0, state.alarmCooldown - dt);

  // 3. Update Patrolling Guards
  let maxSusp = 0;
  let highestState = 'HIDDEN'; // HIDDEN | SUSPICIOUS | SEARCHING | ALARM

  for (const g of state.guards) {
    if (g.hitCooldown > 0) g.hitCooldown = Math.max(0, g.hitCooldown - dt);
    const dx = p.x - g.x, dy = p.y - g.y;
    const dist = Math.hypot(dx, dy);
    const relAng = Math.abs(angleDiff(Math.atan2(dy, dx), g.angle));
    const effRange = g.spec.visionRange * (p.inShadow && p.crouched ? 0.55 : p.inShadow ? 0.75 : p.inLight ? 1.12 : 0.94);
    const canSee = !concealedByCover && ((dist < effRange && relAng <= g.spec.fov * 0.5) || dist < 22)
      && hasLineOfSight(g.x, g.y, p.x, p.y, state.geom, state.smokesActive);

    if (canSee) {
      const distF = Math.max(0.35, 1.35 - dist / effRange);
      const lightF = p.inLight ? 1.45 : p.inShadow ? 0.45 : 0.95;
      const gain = g.spec.suspicionRate * distF * lightF * (p.crouched ? 0.72 : 1) * state.mods.suspicionMult * dt;
      const prev = g.suspicion;
      g.suspicion = Math.min(1, g.suspicion + gain);
      g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
      g.investigateTarget = { x: p.x, y: p.y };
      state.lastSeen = { x: p.x, y: p.y };
      g.fromLure = false;
      g.lurePos = null;

      if (prev < 0.24 && g.suspicion >= 0.24 && g.state === 'PATROL') {
        g.state = 'SUSPICIOUS';
        g.stateTimer = 2.6;
        if (sound) sound.suspicionSting();
      }
      if (g.suspicion >= 1 && g.state !== 'ALARM') {
        triggerAlarmAt(state, g, p.x, p.y, sound, onToast);
      }
    } else if (g.suspicion > 0) {
      const drain = (g.state === 'ALARM' ? 0.16 : 0.23) * state.mods.recoveryMult;
      g.suspicion = Math.max(0, g.suspicion - drain * dt);
    }

    if (g.state === 'ALARM') {
      const tgt = g.investigateTarget || { x: p.x, y: p.y };
      const tx = tgt.x - g.x, ty = tgt.y - g.y, td = Math.hypot(tx, ty);
      if (td > 8) {
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 6.2 * dt);
        moveWithSlide(g, (tx / td) * g.spec.chaseSpeed * dt, (ty / td) * g.spec.chaseSpeed * dt, obs);
      }
      if (dist < g.r + p.r + 4 && g.hitCooldown <= 0) {
        g.hitCooldown = 1.6;
        if (onPlayerHit) onPlayerHit(g);
      }
      if (!canSee) {
        g.stateTimer -= dt;
        if (g.stateTimer <= 0) {
          g.state = 'SEARCHING';
          g.stateTimer = 3.2;
          g.suspicion = 0.62;
          state.alarmOrigin = null;
          state.alarmLinks = [];
        }
      } else {
        g.stateTimer = 3.6;
      }
    } else if (g.state === 'SUSPICIOUS') {
      const tgt = g.investigateTarget;
      if (tgt) {
        const tx = tgt.x - g.x, ty = tgt.y - g.y, td = Math.hypot(tx, ty);
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 3.8 * dt);
        if (td > 20) {
          moveWithSlide(g, (tx / td) * g.spec.speed * 0.92 * dt, (ty / td) * g.spec.speed * 0.92 * dt, obs);
        } else {
          g.state = 'SEARCHING';
          g.stateTimer = Math.max(2.0, g.stateTimer);
          g.searchDir = Math.random() < 0.5 ? 1 : -1;
        }
      } else {
        g.state = 'SEARCHING';
        g.stateTimer = 2.0;
      }
    } else if (g.state === 'SEARCHING') {
      g.angle = normalizeAngle(g.angle + g.searchDir * 1.45 * dt);
      g.stateTimer -= dt;
      if (g.stateTimer <= 0) {
        if (g.peakSuspicion >= 0.42) {
          state.recoveries += 1;
          state.score += Math.round(150 * state.mods.scoreMult);
          if (state.mods.recoveryBurst) p.sprintTimer = 2.4;
          if (sound) sound.recoveryChime();
          if (onToast) onToast('NEAR-MISS RECOVERY · +150 GHOST BONUS', false);
        }
        if (g.fromLure && state.mods.coinRefund && state.coins < state.maxCoins) state.coins += 1;
        g.peakSuspicion = 0;
        g.fromLure = false;
        g.lurePos = null;
        g.rallyTarget = null;
        g.investigateTarget = null;
        g.state = 'PATROL';
      }
    } else {
      const wp = g.waypoints[g.wpIndex];
      const tx = wp.x - g.x, ty = wp.y - g.y, td = Math.hypot(tx, ty);
      if (td < 8) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      } else {
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 3.4 * dt);
        moveWithSlide(g, (tx / td) * g.spec.speed * dt, (ty / td) * g.spec.speed * dt, obs);
      }
    }

    g.visionPoly = computeVisionPolygon(g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, state.geom, state.smokesActive);
    maxSusp = Math.max(maxSusp, g.suspicion);
    if (g.state === 'ALARM') highestState = 'ALARM';
    else if (g.state === 'SEARCHING' && highestState !== 'ALARM') highestState = 'SEARCHING';
    else if (g.state === 'SUSPICIOUS' && highestState === 'HIDDEN') highestState = 'SUSPICIOUS';
  }

  if (highestState === 'HIDDEN') state.lastSeen = null;
  if (maxSusp > 0.35 && sound) sound.heartbeat(state.time, highestState === 'ALARM' ? 1 : maxSusp);
  state.maxSuspicion = maxSusp;
  state.detectionState = highestState;
}
