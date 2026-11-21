// Velvet Curfew — Stealth Exposure, [R] Douse Sconce, [V] Brass Vent, [E] Velvet Veil & [Q] Coin Lure

import { STAGE_H, STAGE_W } from './levels.js';
import { notifySound } from './patrol.js';

export function updateStealthDetection(state, input, dt, sound, onRibbon, onWingClear) {
  const p = state.player;
  let mx = 0, my = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;

  p.crouched = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || p.hiding;
  const moving = mx !== 0 || my !== 0;

  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    const spd = (p.crouched ? 78 * state.mods.crouchSpeedMult : 134) * state.mods.speedMult;
    p.x += mx * spd * dt;
    p.y += my * spd * dt;
    p.angle = Math.atan2(my, mx);
    resolveMovement(p, state.wing.obstacles);
    const last = state.trail[state.trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 22) state.trail.push({ x: p.x, y: p.y });
  }

  evaluateStealthSurface(state, dt);

  const tgtNoise = !moving ? 6 : (p.crouched ? 12 : p.onCarpet ? 28 : 74) * state.mods.noiseMult;
  p.noise += (tgtNoise - p.noise) * Math.min(1, dt * 8);

  if (moving) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.crouched ? 0.46 : 0.28;
      if (sound) sound.playStep(p.onCarpet, p.crouched);
      if (!p.crouched) {
        const radius = (p.onCarpet ? 52 : 102) * state.mods.noiseMult;
        state.ripples.push({ x: p.x, y: p.y, r: 8, maxR: radius, alpha: 0.5, kind: 'step' });
        if (!p.onCarpet) notifySound(state, p.x, p.y, radius, false, sound);
      }
    }
  } else p.stepTimer = 0.1;

  const pickR = 34 + state.mods.lootRangeBonus;
  if (!state.opalTaken && Math.hypot(p.x - state.wing.opal.x, p.y - state.wing.opal.y) < pickR) {
    claimSolisOpal(state, sound, onRibbon);
  }
  for (const r of state.relicItems) {
    if (!r.taken && Math.hypot(p.x - r.x, p.y - r.y) < pickR) {
      r.taken = true;
      state.relicsTaken += 1;
      state.score += Math.round(350 * state.mods.scoreMult);
      spawnSparks(state, r.x, r.y, '#f0d084', 10);
      if (sound) sound.playLootChime();
    }
  }

  const el = state.wing.elevator;
  if (state.opalTaken && Math.hypot(p.x - el.x, p.y - el.y) < el.r + p.r) {
    if (sound) sound.playExtractChord();
    if (onWingClear) onWingClear();
  }
}

export function douseNearbySconce(state, sound, onRibbon) {
  const lamp = findNearestLitSconce(state, 120);
  if (!lamp) {
    if (onRibbon) onRibbon('MOVE NEAR A LIT BRASS SCONCE TO DOUSE [R]', false, 1.8);
    return false;
  }
  lamp.lit = false;
  state.dousedCount += 1;
  state.score += Math.round(100 * state.mods.scoreMult);
  spawnSparks(state, lamp.x, lamp.y, '#94a3b8', 12);
  if (sound) sound.playSconceDouse();

  let alerted = false;
  for (const g of state.guards) {
    if (g.state === 'BREACH') continue;
    if (Math.hypot(g.x - lamp.x, g.y - lamp.y) < 175) {
      g.target = { x: lamp.x, y: lamp.y };
      g.state = 'CURIOUS';
      g.callout = 'DARKENED LAMP?';
      g.suspicion = Math.max(g.suspicion, 0.45);
      g.peakSuspicion = Math.max(g.peakSuspicion, g.suspicion);
      g.stateTimer = 2.8;
      alerted = true;
    }
  }
  if (alerted && sound) sound.playSuspicionSting();
  if (onRibbon) onRibbon('BRASS SCONCE DOUSED — DEEP SHADOW EXPANDED (+100)', false, 2.2);
  evaluateStealthSurface(state, 0);
  return true;
}

export function useBrassFloorVent(state, sound, onRibbon) {
  const vents = state.wing.vents || [];
  const idx = findNearestVent(state, 54);
  if (idx < 0) {
    if (onRibbon) onRibbon('STAND ON A BRASS FLOOR GRATE TO USE VENT [V]', false, 1.8);
    return false;
  }
  const dest = vents[vents[idx].to];
  if (!dest) return false;
  spawnSparks(state, state.player.x, state.player.y, '#2dd4bf', 10);
  state.player.x = dest.x;
  state.player.y = dest.y;
  state.player.crouched = true;
  state.trail.push({ x: dest.x, y: dest.y });
  spawnSparks(state, dest.x, dest.y, '#f4d482', 12);
  if (sound) sound.playVentClunk();
  if (onRibbon) onRibbon('SLIPPED SILENTLY THROUGH SUBFLOOR BRASS VENT', false, 2.2);
  evaluateStealthSurface(state, 0);
  return true;
}

export function deployVelvetVeilSmoke(state, sound, onRibbon) {
  if (state.veils <= 0) { if (onRibbon) onRibbon('NO VELVET VEIL CHARGES LEFT', false); return false; }
  const p = state.player;
  state.veils -= 1;
  const dur = 6.8 + state.mods.smokeDurationBonus;
  const maxR = 68 * state.mods.smokeRadiusMult;
  state.veilsActive.push({ x: p.x, y: p.y, r: 16, maxR, timer: dur, duration: dur, alpha: 0.92 });
  spawnSparks(state, p.x, p.y, '#c4b5fd', 16);
  if (sound) sound.playSconceDouse();
  if (onRibbon) onRibbon('VELVET VEIL RELEASED — SIGHTLINES SEVERED', false);
  return true;
}

export function throwBrassCoinLure(state, tx, ty, sound, onRibbon) {
  if (state.coins <= 0) { if (onRibbon) onRibbon('NO BRASS COINS LEFT', false); return false; }
  const p = state.player;
  const maxD = 235 * state.mods.throwRangeMult;
  let dx = tx - p.x, dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 18) { dx = Math.cos(p.angle) * 135; dy = Math.sin(p.angle) * 135; }
  else if (dist > maxD) { dx = (dx / dist) * maxD; dy = (dy / dist) * maxD; }
  const lx = Math.max(24, Math.min(STAGE_W - 24, p.x + dx));
  const ly = Math.max(24, Math.min(STAGE_H - 24, p.y + dy));
  state.coins -= 1;
  state.coinsUsed += 1;
  state.coinsInFlight.push({ sx: p.x, sy: p.y, tx: lx, ty: ly, t: 0, dur: 0.34 });
  if (sound) sound.playStep(true, true);
  return true;
}

export function computeMods(perks) {
  const m = {
    speedMult: 1, crouchSpeedMult: 1, noiseMult: 1, lureRadiusMult: 1,
    lureHoldBonus: 0, shadowLinger: 0, suspicionMult: 1, recoveryMult: 1,
    smokeRadiusMult: 1, smokeDurationBonus: 0, throwRangeMult: 1,
    scoreMult: 1, lootRangeBonus: 0, bonusCoins: 0, bonusVeils: 0,
  };
  for (const pk of perks) if (pk && pk.apply) pk.apply(m);
  return m;
}

export function evaluateStealthSurface(state, dt) {
  const p = state.player;
  const w = state.wing;
  p.onCarpet = (w.carpets || []).some((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
  p.inVeil = state.veilsActive.some((s) => s.alpha > 0.22 && Math.hypot(p.x - s.x, p.y - s.y) <= s.r * 0.92);
  p.inAlcove = (w.alcoves || []).some((a) => p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h);

  let settee = false;
  for (const o of w.obstacles) {
    if (o.kind !== 'settee' && o.kind !== 'screen') continue;
    const pad = 16;
    if (p.x >= o.x - pad && p.x <= o.x + o.w + pad && p.y >= o.y - pad && p.y <= o.y + o.h + pad) { settee = true; break; }
  }
  p.inSettee = settee;

  let lightAmt = 0;
  let inDoused = false;
  for (const l of state.lights) {
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (l.lit) {
      if (d < l.r * 0.9) lightAmt = Math.max(lightAmt, 1 - d / (l.r * 0.9));
    } else if (d < l.r * 0.74) {
      inDoused = true;
    }
  }
  p.inDoused = inDoused;
  p.lampInRange = Boolean(findNearestLitSconce(state, 120));
  p.ventInRange = findNearestVent(state, 54) >= 0;

  const rawShadow = p.inVeil || p.inDoused || p.inAlcove || (settee && p.crouched) || lightAmt < 0.16;
  if (rawShadow) { p.shadowLingerTimer = state.mods.shadowLinger; p.inShadow = true; }
  else if (p.shadowLingerTimer > 0) { p.shadowLingerTimer = Math.max(0, p.shadowLingerTimer - dt); p.inShadow = true; }
  else p.inShadow = false;

  p.inLight = !p.inVeil && !p.inDoused && !(settee && p.crouched) && !p.inAlcove && lightAmt >= 0.22;
  p.exposure = p.inVeil ? 0.06 : p.inDoused ? 0.08 : p.inAlcove || (settee && p.crouched) ? 0.12 : p.inShadow ? 0.18 : Math.min(1, 0.36 + lightAmt * 0.64);
}

export function claimSolisOpal(state, sound, onRibbon) {
  state.opalTaken = true;
  state.relicsTaken += 1;
  const pts = Math.round(1200 * state.mods.scoreMult);
  state.score += pts;
  spawnSparks(state, state.wing.opal.x, state.wing.opal.y, '#38bdf8', 22);
  state.ripples.push({ x: state.wing.opal.x, y: state.wing.opal.y, r: 12, maxR: 84, alpha: 0.85, kind: 'opal' });
  if (sound) sound.playLootChime();
  if (onRibbon) onRibbon(`THE SOLIS OPAL LIFTED (+${pts}) — BOARD THE BRASS ELEVATOR!`, false);
}

export function spawnSparks(state, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const sp = 28 + Math.random() * 64;
    state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55 + Math.random() * 0.3, maxLife: 0.85, color, size: 2.2 });
  }
}

export function updateEffects(state, dt, sound) {
  for (let i = state.coinsInFlight.length - 1; i >= 0; i--) {
    const c = state.coinsInFlight[i];
    c.t += dt;
    if (c.t >= c.dur) {
      const lureR = 178 * state.mods.lureRadiusMult;
      state.lastCoinArc = { sx: c.sx, sy: c.sy, tx: c.tx, ty: c.ty, alpha: 0.85 };
      state.ripples.push(
        { x: c.tx, y: c.ty, r: 14, maxR: lureR, alpha: 0.96, kind: 'coin', label: 'CLINK!' },
        { x: c.tx, y: c.ty, r: 4, maxR: lureR * 0.62, alpha: 0.82, kind: 'coin' }
      );
      spawnSparks(state, c.tx, c.ty, '#f0d084', 10);
      if (sound) sound.playCoinClink();
      notifySound(state, c.tx, c.ty, lureR, true, sound);
      state.coinsInFlight.splice(i, 1);
    }
  }
  if (state.lastCoinArc && !state.shotMode) {
    state.lastCoinArc.alpha -= dt * 0.55;
    if (state.lastCoinArc.alpha <= 0) state.lastCoinArc = null;
  }
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const rp = state.ripples[i];
    rp.r += (rp.maxR - rp.r) * Math.min(1, dt * 3.0) + 24 * dt;
    rp.alpha -= dt * (rp.kind === 'coin' ? 0.44 : 0.86);
    if (rp.alpha <= 0.02 || rp.r >= rp.maxR) state.ripples.splice(i, 1);
  }
  for (let i = state.veilsActive.length - 1; i >= 0; i--) {
    const sm = state.veilsActive[i];
    sm.r += (sm.maxR - sm.r) * Math.min(1, dt * 5.0);
    sm.timer -= dt;
    sm.alpha = sm.timer < 1.5 ? Math.max(0, (sm.timer / 1.5) * 0.9) : 0.9;
    if (sm.timer <= 0) state.veilsActive.splice(i, 1);
  }
  for (let i = state.guardSteps.length - 1; i >= 0; i--) {
    const gs = state.guardSteps[i];
    gs.r += 34 * dt;
    gs.alpha -= dt * 0.72;
    if (gs.alpha <= 0.02 || gs.r >= gs.maxR) state.guardSteps.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
}

function resolveMovement(entity, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.kind === 'settee') continue;
    const cx = Math.max(o.x, Math.min(entity.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(entity.y, o.y + o.h));
    const dx = entity.x - cx, dy = entity.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < entity.r * entity.r) {
      const d = Math.sqrt(d2) || 0.001;
      entity.x += (dx / d) * (entity.r - d);
      entity.y += (dy / d) * (entity.r - d);
    }
  }
  entity.x = Math.max(20, Math.min(STAGE_W - 20, entity.x));
  entity.y = Math.max(20, Math.min(STAGE_H - 20, entity.y));
}

function findNearestLitSconce(state, maxDist = 115) {
  const p = state.player;
  let best = null, bestD = maxDist;
  for (const l of state.lights) {
    if (!l.lit) continue;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < bestD) { bestD = d; best = l; }
  }
  return best;
}

function findNearestVent(state, maxDist = 48) {
  const p = state.player;
  const vents = state.wing.vents || [];
  let bestIdx = -1, bestD = maxDist;
  for (let i = 0; i < vents.length; i++) {
    const d = Math.hypot(p.x - vents[i].x, p.y - vents[i].y);
    if (d < bestD) { bestD = d; bestIdx = i; }
  }
  return bestIdx;
}
