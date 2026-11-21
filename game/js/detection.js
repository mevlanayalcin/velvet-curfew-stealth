// Velvet Curfew v2 — Player Movement, Low-Cover Crouch Hiding, Loot, Coin Lures & Smoke

import { STAGE_H, STAGE_W } from './levels.js';
import { alertGuardsToSound } from './patrol.js';

export function defaultMods() {
  return {
    speedMult: 1, crouchSpeedMult: 1, noiseMult: 1, lureRadiusMult: 1,
    lureHoldBonus: 0, shadowLinger: 0, suspicionMult: 1, recoveryMult: 1,
    smokeRadiusMult: 1, smokeDurationBonus: 0, throwRangeMult: 1,
    scoreMult: 1, lootRangeBonus: 0, bonusCoins: 0, bonusSmokes: 0,
    recoveryBurst: false, coinRefund: false,
  };
}

export function computeMods(perks) {
  const m = defaultMods();
  for (const pk of perks) if (pk && pk.apply) pk.apply(m);
  return m;
}

export function resolveCircleRects(entity, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.kind === 'low') continue; // Player can slip into low planters/benches to crouch-hide
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

export function evaluateStealthSurface(state, dt) {
  const p = state.player;
  const w = state.wing;
  p.onCarpet = (w.carpets || []).some((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);

  p.inSmoke = state.smokesActive.some(
    (s) => s.alpha > 0.22 && Math.hypot(p.x - s.x, p.y - s.y) <= s.r * 0.92
  );

  // Check if inside or hugging low crouch-hide cover (planters/benches)
  let lowCover = false;
  for (const o of w.obstacles) {
    if (o.kind !== 'low') continue;
    const pad = 12;
    if (p.x >= o.x - pad && p.x <= o.x + o.w + pad && p.y >= o.y - pad && p.y <= o.y + o.h + pad) {
      lowCover = true;
      break;
    }
  }
  p.inLowCover = lowCover;

  // Check warm chandelier light exposure
  let lightIntensity = 0;
  for (const l of w.lights) {
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < l.r * 0.92) lightIntensity = Math.max(lightIntensity, 1 - d / (l.r * 0.92));
  }

  const rawShadow = p.inSmoke || (lowCover && p.crouched) || lightIntensity < 0.18;
  if (rawShadow) {
    p.shadowLingerTimer = state.mods.shadowLinger;
    p.inShadow = true;
  } else if (p.shadowLingerTimer > 0) {
    p.shadowLingerTimer = Math.max(0, p.shadowLingerTimer - dt);
    p.inShadow = true;
  } else {
    p.inShadow = false;
  }
  p.inLight = !p.inSmoke && !(lowCover && p.crouched) && lightIntensity >= 0.22;
  p.visibility = p.inSmoke ? 0.05 : (lowCover && p.crouched) ? 0.08 : p.inShadow ? 0.14 : Math.min(1, 0.35 + lightIntensity * 0.65);
}

export function updatePlayer(state, input, dt, sound, onToast, onWingClear) {
  const p = state.player;
  let mx = 0, my = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;

  p.crouched = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || p.hiding;
  if (p.sprintTimer > 0) p.sprintTimer = Math.max(0, p.sprintTimer - dt);

  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    const base = p.crouched ? 78 * state.mods.crouchSpeedMult : 134;
    const spd = base * state.mods.speedMult * (p.sprintTimer > 0 ? 1.3 : 1);
    p.x += mx * spd * dt;
    p.y += my * spd * dt;
    p.angle = Math.atan2(my, mx);
    resolveCircleRects(p, state.wing.obstacles);
  }

  evaluateStealthSurface(state, dt);

  const targetNoise = !moving ? 6 : (p.crouched ? 12 : p.onCarpet ? 32 : 76) * state.mods.noiseMult * (p.sprintTimer > 0 ? 0.45 : 1);
  p.noise += (targetNoise - p.noise) * Math.min(1, dt * 8);

  if (moving) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.crouched ? 0.46 : 0.28;
      if (sound) sound.step(p.onCarpet, p.crouched);
      if (!p.crouched && p.sprintTimer <= 0) {
        const radius = (p.onCarpet ? 54 : 104) * state.mods.noiseMult;
        state.ripples.push({ x: p.x, y: p.y, r: 8, maxR: radius, alpha: 0.52, kind: 'step' });
        if (!p.onCarpet) alertGuardsToSound(state, p.x, p.y, radius, false, sound);
      }
    }
  } else {
    p.stepTimer = 0.1;
  }

  // Pick up Vault Ledger & bonus gold loot stacks
  const pickR = 28 + state.mods.lootRangeBonus;
  if (!state.ledgerStolen && Math.hypot(p.x - state.wing.ledger.x, p.y - state.wing.ledger.y) < pickR) {
    claimLedger(state, sound, onToast);
  }
  for (const item of state.lootItems) {
    if (!item.taken && Math.hypot(p.x - item.x, p.y - item.y) < pickR) {
      item.taken = true;
      state.lootTaken += 1;
      const pts = Math.round(350 * state.mods.scoreMult);
      state.score += pts;
      spawnSparks(state, item.x, item.y, '#f4d078', 10);
      if (sound) sound.lootChime();
    }
  }

  // Extract via emerald Exit once Ledger is stolen
  const ex = state.wing.exit;
  if (state.ledgerStolen && Math.hypot(p.x - ex.x, p.y - ex.y) < ex.r + p.r) {
    if (sound) sound.extractChord();
    if (onWingClear) onWingClear();
  }
}

export function claimLedger(state, sound, onToast) {
  state.ledgerStolen = true;
  state.lootTaken += 1;
  const pts = Math.round(1000 * state.mods.scoreMult);
  state.score += pts;
  spawnSparks(state, state.wing.ledger.x, state.wing.ledger.y, '#facc15', 18);
  state.ripples.push({ x: state.wing.ledger.x, y: state.wing.ledger.y, r: 10, maxR: 68, alpha: 0.8, kind: 'loot' });
  if (sound) sound.lootChime();
  if (onToast) onToast(`${state.wing.ledger.label.toUpperCase()} STOLEN (+${pts}) — SLIP TO EXIT!`, false);
}

export function throwCoin(state, tx, ty, sound, onToast) {
  if (state.coins <= 0) {
    if (onToast) onToast('NO BRASS COINS REMAINING', false);
    return false;
  }
  const p = state.player;
  const maxDist = 230 * state.mods.throwRangeMult;
  let dx = tx - p.x, dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 18) { dx = Math.cos(p.angle) * 130; dy = Math.sin(p.angle) * 130; }
  else if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
  const lx = Math.max(24, Math.min(STAGE_W - 24, p.x + dx));
  const ly = Math.max(24, Math.min(STAGE_H - 24, p.y + dy));
  state.coins -= 1;
  state.coinsInFlight.push({ sx: p.x, sy: p.y, tx: lx, ty: ly, t: 0, dur: 0.32 });
  if (sound) sound.step(true, true);
  return true;
}

export function deploySmoke(state, sound, onToast) {
  if (state.smokes <= 0) {
    if (onToast) onToast('NO VELVET SMOKE CHARGES', false);
    return false;
  }
  const p = state.player;
  state.smokes -= 1;
  const dur = 6.5 + state.mods.smokeDurationBonus;
  const maxR = 64 * state.mods.smokeRadiusMult;
  state.smokesActive.push({ x: p.x, y: p.y, r: 16, maxR, timer: dur, duration: dur, alpha: 0.9 });
  spawnSparks(state, p.x, p.y, '#a78bfa', 14);
  if (sound) sound.smokeHiss();
  if (onToast) onToast('VELVET SMOKE DEPLOYED — SIGHTLINES BROKEN', false);
  return true;
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
      const lureR = 175 * state.mods.lureRadiusMult;
      state.ripples.push(
        { x: c.tx, y: c.ty, r: 14, maxR: lureR, alpha: 0.96, kind: 'coin', label: 'WHAT WAS THAT?' },
        { x: c.tx, y: c.ty, r: 4, maxR: lureR * 0.65, alpha: 0.82, kind: 'coin' }
      );
      spawnSparks(state, c.tx, c.ty, '#facc15', 8);
      if (sound) sound.coinClink();
      alertGuardsToSound(state, c.tx, c.ty, lureR, true, sound);
      state.coinsInFlight.splice(i, 1);
    }
  }
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const rp = state.ripples[i];
    rp.r += (rp.maxR - rp.r) * Math.min(1, dt * 3.1) + 26 * dt;
    rp.alpha -= dt * (rp.kind === 'coin' ? 0.46 : 0.88);
    if (rp.alpha <= 0.02 || rp.r >= rp.maxR) state.ripples.splice(i, 1);
  }
  for (let i = state.smokesActive.length - 1; i >= 0; i--) {
    const sm = state.smokesActive[i];
    sm.r += (sm.maxR - sm.r) * Math.min(1, dt * 5.2);
    sm.timer -= dt;
    sm.alpha = sm.timer < 1.4 ? Math.max(0, (sm.timer / 1.4) * 0.9) : 0.9;
    if (sm.timer <= 0) state.smokesActive.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
}
