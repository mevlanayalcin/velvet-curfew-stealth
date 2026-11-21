// Velvet Curfew — Curator/Docent Patrol AI, Brass-Eye Cameras, Tripwires & Guard Footstep Sonar

import { GUARD_TYPES } from './levels.js';
import {
  angleDiff, computeRaycastVisionCone, hasLineOfSight,
  isPointInVisionCone, normalizeAngle, pointToSegmentDist,
} from './vision.js';

export function updateCuratorPatrols(state, dt, sound, onCaught, onRibbon) {
  updateBrassEyeCameras(state, dt, sound, onRibbon);

  const p = state.player;
  const obs = state.wing.obstacles;
  const concealed = p.inVeil || (p.inSettee && p.crouched);
  let maxSusp = 0;
  let badge = 'UNSEEN';

  for (const g of state.guards) {
    if (g.hitCooldown > 0) g.hitCooldown = Math.max(0, g.hitCooldown - dt);
    const prevX = g.x, prevY = g.y;
    const dx = p.x - g.x, dy = p.y - g.y;
    const dist = Math.hypot(dx, dy);
    const effRange = g.spec.visionRange * (p.inShadow && p.crouched ? 0.56 : p.inShadow ? 0.74 : 1.0);
    const inCone = isPointInVisionCone(g.x, g.y, g.angle, g.spec.fov, effRange, p.x, p.y, state.geom, state.veilsActive);
    const closeBump = dist < 22 && hasLineOfSight(g.x, g.y, p.x, p.y, state.geom, state.veilsActive);
    const canSee = !concealed && (inCone || closeBump);

    if (canSee) {
      const distF = Math.max(0.35, 1.35 - dist / effRange);
      const lightF = p.inLight ? 1.45 : p.inShadow ? 0.44 : 0.95;
      const gain = g.spec.suspicionRate * distF * lightF * (p.crouched ? 0.72 : 1) * state.mods.suspicionMult * dt;
      const prev = g.suspicion;
      g.suspicion = Math.min(1, g.suspicion + gain);
      g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
      g.target = { x: p.x, y: p.y };
      state.lastGlimpse = { x: p.x, y: p.y, angle: p.angle };
      g.lurePos = null;

      if (prev < 0.25 && g.suspicion >= 0.25 && g.state === 'PATROL') {
        g.state = 'CURIOUS';
        g.callout = 'FOOTSTEP?';
        g.stateTimer = 2.6;
        if (sound) sound.playSuspicionSting();
      }
      if (g.suspicion >= 1 && g.state !== 'BREACH') {
        soundCurfewBell(state, g, p.x, p.y, sound, onRibbon);
      }
    } else if (g.suspicion > 0) {
      g.suspicion = Math.max(0, g.suspicion - (g.state === 'BREACH' ? 0.16 : 0.23) * state.mods.recoveryMult * dt);
    }

    if (g.state === 'BREACH') {
      const tgt = g.target || { x: p.x, y: p.y };
      const tx = tgt.x - g.x, ty = tgt.y - g.y, td = Math.hypot(tx, ty);
      if (td > 8) {
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 6.2 * dt);
        moveWithSlide(g, (tx / td) * g.spec.chaseSpeed * dt, (ty / td) * g.spec.chaseSpeed * dt, obs);
      }
      if (dist < g.r + p.r + 4 && g.hitCooldown <= 0) {
        g.hitCooldown = 1.6;
        if (onCaught) onCaught(g);
      }
      if (!canSee) {
        g.stateTimer -= dt;
        if (g.stateTimer <= 0) {
          g.state = 'SWEEPING';
          g.callout = null;
          g.stateTimer = 3.2;
          g.suspicion = 0.6;
          state.bellOrigin = null;
          state.bellLinks = [];
        }
      } else g.stateTimer = 3.6;
    } else if (g.state === 'CURIOUS') {
      const tgt = g.target;
      if (tgt) {
        const tx = tgt.x - g.x, ty = tgt.y - g.y, td = Math.hypot(tx, ty);
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 3.8 * dt);
        if (td > 22) moveWithSlide(g, (tx / td) * g.spec.speed * 0.92 * dt, (ty / td) * g.spec.speed * 0.92 * dt, obs);
        else { g.state = 'SWEEPING'; g.stateTimer = Math.max(2.0, g.stateTimer); g.searchDir = Math.random() < 0.5 ? 1 : -1; }
      } else { g.state = 'SWEEPING'; g.stateTimer = 2.0; }
    } else if (g.state === 'SWEEPING') {
      if (g.target) {
        const tx = g.target.x - g.x, ty = g.target.y - g.y, td = Math.hypot(tx, ty);
        if (td > 26) {
          g.angle = turnToward(g.angle, Math.atan2(ty, tx), 4.6 * dt);
          const stepped = moveWithSlide(g, (tx / td) * g.spec.speed * 1.08 * dt, (ty / td) * g.spec.speed * 1.08 * dt, obs);
          if (!stepped) { g.target = null; g.callout = 'SWEEPING'; }
        } else {
          g.target = null;
          g.callout = 'SWEEPING';
        }
      } else {
        g.angle = normalizeAngle(g.angle + g.searchDir * 1.45 * dt);
      }
      g.stateTimer -= dt;
      if (g.stateTimer <= 0) {
        if (g.peakSuspicion >= 0.42) {
          state.recoveries += 1;
          state.score += Math.round(150 * state.mods.scoreMult);
          if (sound) sound.playRecoveryChime();
          if (onRibbon) onRibbon('SLIPPED AWAY · +150 GHOST BONUS', false);
        }
        g.peakSuspicion = 0; g.lurePos = null; g.callout = null; g.target = null; g.state = 'PATROL';
      }
    } else {
      const wp = g.waypoints[g.wpIndex];
      const tx = wp.x - g.x, ty = wp.y - g.y, td = Math.hypot(tx, ty);
      if (td < 8) g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      else {
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 3.4 * dt);
        moveWithSlide(g, (tx / td) * g.spec.speed * dt, (ty / td) * g.spec.speed * dt, obs);
      }
    }

    const movedDist = Math.hypot(g.x - prevX, g.y - prevY);
    if (movedDist > 0.25) {
      g.stepTimer -= dt;
      if (g.stepTimer <= 0) {
        g.stepTimer = g.state === 'BREACH' ? 0.34 : 0.62;
        emitGuardFootstepEcho(state, g, p, sound);
      }
    }

    g.visionPoly = computeRaycastVisionCone(g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, state.geom, state.veilsActive);
    maxSusp = Math.max(maxSusp, g.suspicion);
    if (g.state === 'BREACH') badge = 'BREACH';
    else if (g.state === 'SWEEPING' && badge !== 'BREACH') badge = 'SWEEPING';
    else if (g.state === 'CURIOUS' && badge === 'UNSEEN') badge = 'CURIOUS';
  }

  if (badge === 'UNSEEN') state.lastGlimpse = null;
  if (maxSusp > 0.35 && sound) sound.playHeartbeat(state.time, badge === 'BREACH' ? 1 : maxSusp);
  state.maxSuspicion = maxSusp;
  state.detectionState = badge;
}

export function updateBrassEyeCameras(state, dt, sound, onRibbon) {
  const p = state.player;
  const concealed = p.inVeil || (p.inSettee && p.crouched);

  for (const cam of state.cameras) {
    cam.angle = cam.baseAngle + Math.sin(state.time * cam.speed + cam.id * 1.3) * cam.sweep;
    cam.visionPoly = computeRaycastVisionCone(cam.x, cam.y, cam.angle, cam.fov, cam.range, state.geom, state.veilsActive);
    cam.alerting = !concealed && isPointInVisionCone(cam.x, cam.y, cam.angle, cam.fov, cam.range, p.x, p.y, state.geom, state.veilsActive);
    if (cam.alerting && state.bellCooldown <= 0) {
      soundCurfewBell(state, null, p.x, p.y, sound, onRibbon);
    }
  }

  for (const tw of state.tripwires) {
    if (tw.cooldown > 0) tw.cooldown = Math.max(0, tw.cooldown - dt);
    tw.active = (((state.time + tw.phase) % tw.period) / tw.period) < tw.duty;
    if (tw.active && tw.cooldown <= 0 && pointToSegmentDist(p.x, p.y, tw.x1, tw.y1, tw.x2, tw.y2) < p.r + 3) {
      tw.cooldown = 3.0;
      soundCurfewBell(state, null, p.x, p.y, sound, onRibbon);
    }
  }
  if (state.bellCooldown > 0) state.bellCooldown = Math.max(0, state.bellCooldown - dt);
}

export function emitGuardFootstepEcho(state, guard, player, sound) {
  const dToPlayer = Math.hypot(guard.x - player.x, guard.y - player.y);
  if (dToPlayer >= 420) return;
  state.guardSteps.push({
    x: guard.x, y: guard.y, r: 10, maxR: guard.state === 'BREACH' ? 54 : 44,
    alpha: guard.state === 'BREACH' ? 0.85 : 0.65,
    danger: guard.state === 'BREACH' || guard.state === 'CURIOUS',
  });
  if (sound) sound.playGuardFootstep((guard.x - player.x) / 360, 1 - dToPlayer / 420);
}

export function createGuards(wing, geom) {
  return wing.guards.map((g, idx) => {
    const spec = GUARD_TYPES[g.type] || GUARD_TYPES.curator;
    const guard = {
      id: idx, type: g.type, spec,
      x: g.x, y: g.y, r: 11, angle: g.angle ?? 0,
      state: 'PATROL', suspicion: 0, peakSuspicion: 0, stateTimer: 0,
      waypoints: g.waypoints.map((w) => ({ x: w.x, y: w.y })), wpIndex: 0,
      target: null, lurePos: null, callout: null, searchDir: 1,
      hitCooldown: 0, stepTimer: 0.2 + idx * 0.14, visionPoly: [],
    };
    guard.visionPoly = computeRaycastVisionCone(guard.x, guard.y, guard.angle, spec.fov, spec.visionRange, geom, []);
    return guard;
  });
}

export function createCameras(wing, geom) {
  return (wing.cameras || []).map((c, idx) => {
    const cam = {
      id: idx, x: c.x, y: c.y, baseAngle: c.baseAngle, angle: c.baseAngle,
      sweep: c.sweep, speed: c.speed, range: c.range, fov: c.fov,
      alerting: false, visionPoly: [],
    };
    cam.visionPoly = computeRaycastVisionCone(cam.x, cam.y, cam.angle, cam.fov, cam.range, geom, []);
    return cam;
  });
}

export function createTripwires(wing) {
  return (wing.tripwires || []).map((t, idx) => ({
    id: idx, x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2,
    period: t.period || 4.4, duty: t.duty || 0.62, phase: t.phase || 0,
    active: true, cooldown: 0,
  }));
}

export function notifySound(state, x, y, radius, isLure, sound) {
  let heard = 0;
  for (const g of state.guards) {
    if (g.state === 'BREACH') continue;
    if (Math.hypot(g.x - x, g.y - y) > radius * g.spec.hearMult) continue;
    g.target = { x, y };
    g.lurePos = isLure ? { x, y } : null;
    g.callout = 'FOOTSTEP?';
    g.state = 'CURIOUS';
    g.stateTimer = (isLure ? 3.5 : 2.2) + (isLure ? state.mods.lureHoldBonus : 0);
    g.suspicion = Math.max(g.suspicion, isLure ? 0.56 : 0.36);
    g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
    heard++;
  }
  if (heard > 0 && sound) sound.playSuspicionSting();
  return heard;
}

export function soundCurfewBell(state, sourceGuard, x, y, sound, onRibbon) {
  const alreadyInBreach = state.guards.some((g) => g.state === 'BREACH');
  const shouldToll = !alreadyInBreach && state.bellCooldown <= 0;
  if (shouldToll) {
    state.alerts += 1;
    state.wingAlerts += 1;
    state.bellCount = Math.min(3, state.bellCount + 1);
    state.bellCooldown = 4.5;
  }
  state.lastGlimpse = { x, y, angle: state.player.angle };
  state.bellOrigin = { x, y };
  state.bellLinks = [];

  for (const g of state.guards) {
    if (sourceGuard && g.id === sourceGuard.id) {
      g.state = 'BREACH'; g.suspicion = 1; g.stateTimer = 4.2; g.target = { x, y }; g.callout = 'CURFEW BELL!';
      continue;
    }
    if (g.state === 'BREACH') {
      g.target = { x, y }; g.stateTimer = Math.max(g.stateTimer, 3.6);
      continue;
    }
    if (Math.hypot(g.x - x, g.y - y) < 390) {
      g.state = 'SWEEPING'; g.suspicion = Math.max(g.suspicion, 0.72); g.peakSuspicion = Math.max(g.peakSuspicion, 0.72);
      g.target = { x, y }; g.callout = 'CONVERGING'; g.stateTimer = 4.2;
      state.bellLinks.push({ x1: x, y1: y, x2: g.x, y2: g.y });
    }
  }
  if (shouldToll) {
    if (sound) sound.playCurfewBell();
    if (onRibbon) onRibbon('CURFEW BELL! Slip behind marble cover or pop Velvet Veil [E].', true);
    if (state.bellCount >= 3) state.lockdown = true;
  }
}

function moveWithSlide(entity, dx, dy, obstacles) {
  const ok = (nx, ny) => {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.kind === 'settee') continue;
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

function turnToward(cur, target, maxStep) {
  const d = angleDiff(target, cur);
  return Math.abs(d) <= maxStep ? normalizeAngle(target) : normalizeAngle(cur + Math.sign(d) * maxStep);
}
