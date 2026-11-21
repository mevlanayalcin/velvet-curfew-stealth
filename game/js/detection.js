// Velvet Curfew — Infiltrator Controls, Light/Shadow Stealth, Coin Lures, Smoke & Grading

import { STAGE_H, STAGE_W } from './levels.js';
import { alertGuardsToSound } from './patrol.js';

export function defaultMods() {
  return {
    speedMult: 1,
    crouchSpeedMult: 1,
    noiseMult: 1,
    lureRadiusMult: 1,
    lureHoldBonus: 0,
    shadowLinger: 0,
    suspicionMult: 1,
    recoveryMult: 1,
    smokeRadiusMult: 1,
    smokeDurationBonus: 0,
    throwRangeMult: 1,
    lightPenaltyMult: 1,
    scoreMult: 1,
    lootRangeBonus: 0,
    bonusCoins: 0,
    bonusSmokes: 0,
    bonusIntegrity: 0,
    wingBonus: 0,
    showRoutes: false,
    recoveryBurst: false,
    coinRefund: false,
  };
}

export function computeMods(perks) {
  const m = defaultMods();
  for (const perk of perks) {
    if (perk && typeof perk.apply === 'function') perk.apply(m);
  }
  return m;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function resolveCircleRects(entity, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const cx = Math.max(o.x, Math.min(entity.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(entity.y, o.y + o.h));
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < entity.r * entity.r) {
      const d = Math.sqrt(d2) || 0.001;
      const push = entity.r - d;
      entity.x += (dx / d) * push;
      entity.y += (dy / d) * push;
    }
  }
  entity.x = Math.max(18, Math.min(STAGE_W - 18, entity.x));
  entity.y = Math.max(18, Math.min(STAGE_H - 18, entity.y));
}

export function evaluateStealthSurface(state, dt) {
  const p = state.player;
  const w = state.wing;
  p.onCarpet = w.carpets.some((c) => pointInRect(p.x, p.y, c));

  // Inside active Velvet Smoke cloud?
  p.inSmoke = state.smokesActive.some(
    (s) => s.alpha > 0.25 && Math.hypot(p.x - s.x, p.y - s.y) <= s.r * 0.92
  );

  // Inside warm chandelier light pool?
  let lit = false;
  for (const l of w.lights) {
    if (Math.hypot(p.x - l.x, p.y - l.y) < l.r * 0.86) { lit = true; break; }
  }

  // Inside deep indigo shadow pocket or hugging cover?
  let inShadowZone = w.shadows.some((s) => pointInRect(p.x, p.y, s));
  let huggingCover = false;
  for (const o of w.obstacles) {
    if (o.kind === 'wall') continue;
    const pad = 16;
    if (p.x >= o.x - pad && p.x <= o.x + o.w + pad && p.y >= o.y - pad && p.y <= o.y + o.h + pad) {
      huggingCover = true;
      break;
    }
  }

  const rawShadow = p.inSmoke || inShadowZone || (huggingCover && p.crouched && !lit);
  if (rawShadow) {
    p.shadowLingerTimer = state.mods.shadowLinger;
    p.inShadow = true;
  } else if (p.shadowLingerTimer > 0) {
    p.shadowLingerTimer = Math.max(0, p.shadowLingerTimer - dt);
    p.inShadow = true;
  } else {
    p.inShadow = false;
  }
  p.inLight = !p.inSmoke && !p.inShadow && lit;
}

export function updatePlayer(state, input, dt, sound, onToast, onWingClear) {
  const p = state.player;
  let mx = 0;
  let my = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;

  p.crouched = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || p.hiding;
  if (p.sprintTimer > 0) p.sprintTimer = Math.max(0, p.sprintTimer - dt);

  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const baseSpeed = p.crouched ? 76 * state.mods.crouchSpeedMult : 128;
    const boost = p.sprintTimer > 0 ? 1.32 : 1.0;
    const speed = baseSpeed * state.mods.speedMult * boost;
    p.x += mx * speed * dt;
    p.y += my * speed * dt;
    p.angle = Math.atan2(my, mx);
    resolveCircleRects(p, state.wing.obstacles);
  }

  evaluateStealthSurface(state, dt);

  // Footstep acoustics & ripples
  const targetNoise = !moving
    ? 6
    : (p.crouched ? 16 : p.onCarpet ? 36 : 68) * state.mods.noiseMult * (p.sprintTimer > 0 ? 0.45 : 1);
  p.noise += (targetNoise - p.noise) * Math.min(1, dt * 8);

  if (moving) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.crouched ? 0.46 : 0.29;
      if (sound) sound.step(p.onCarpet, p.crouched);
      if (!p.crouched && p.sprintTimer <= 0) {
        const radius = (p.onCarpet ? 52 : 98) * state.mods.noiseMult;
        state.ripples.push({ x: p.x, y: p.y, r: 8, maxR: radius, alpha: 0.55, kind: 'step' });
        if (!p.onCarpet) alertGuardsToSound(state, p.x, p.y, radius, false, sound);
      }
    }
  } else {
    p.stepTimer = 0.1;
  }

  // Automatic proximity pickup for Vault Ledger / Relic or press [E]
  const pickupR = 30 + state.mods.lootRangeBonus;
  if (!state.ledgerStolen && Math.hypot(p.x - state.wing.ledger.x, p.y - state.wing.ledger.y) < pickupR) {
    claimLedger(state, sound, onToast);
  }
  if (state.wing.relic && !state.relicStolen && Math.hypot(p.x - state.wing.relic.x, p.y - state.wing.relic.y) < pickupR) {
    claimRelic(state, sound, onToast);
  }

  // Exit extraction check
  const ex = state.wing.exit;
  if (state.ledgerStolen && Math.hypot(p.x - ex.x, p.y - ex.y) < ex.r + p.r) {
    if (sound) sound.extractChord();
    if (onWingClear) onWingClear();
  }
}

export function claimLedger(state, sound, onToast) {
  state.ledgerStolen = true;
  const pts = Math.round(1000 * state.mods.scoreMult);
  state.score += pts;
  spawnSparks(state, state.wing.ledger.x, state.wing.ledger.y, '#f2cc78', 16);
  state.ripples.push({ x: state.wing.ledger.x, y: state.wing.ledger.y, r: 10, maxR: 62, alpha: 0.75, kind: 'loot' });
  if (sound) sound.lootChime();
  if (onToast) onToast(`VAULT LEDGER SECURED (+${pts}) · REACH EMERALD EXIT`);
}

export function claimRelic(state, sound, onToast) {
  state.relicStolen = true;
  const pts = Math.round(600 * state.mods.scoreMult);
  state.score += pts;
  spawnSparks(state, state.wing.relic.x, state.wing.relic.y, '#38bdf8', 12);
  if (sound) sound.lootChime();
  if (onToast) onToast(`${state.wing.relic.label.toUpperCase()} STOLEN (+${pts})`);
}

export function throwCoin(state, tx, ty, sound, onToast) {
  if (state.coins <= 0) {
    if (onToast) onToast('NO BRASS COINS LEFT');
    return false;
  }
  const p = state.player;
  const maxDist = 210 * state.mods.throwRangeMult;
  let dx = tx - p.x;
  let dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 18) {
    dx = Math.cos(p.angle) * 120;
    dy = Math.sin(p.angle) * 120;
  } else if (dist > maxDist) {
    dx = (dx / dist) * maxDist;
    dy = (dy / dist) * maxDist;
  }
  const landX = Math.max(24, Math.min(STAGE_W - 24, p.x + dx));
  const landY = Math.max(24, Math.min(STAGE_H - 24, p.y + dy));
  state.coins -= 1;
  state.coinsInFlight.push({ sx: p.x, sy: p.y, tx: landX, ty: landY, t: 0, dur: 0.34 });
  if (sound) sound.step(true, true);
  return true;
}

export function deploySmoke(state, sound, onToast) {
  if (state.smokes <= 0) {
    if (onToast) onToast('NO VELVET SMOKE CHARGES');
    return false;
  }
  const p = state.player;
  state.smokes -= 1;
  const dur = 6.5 + state.mods.smokeDurationBonus;
  const maxR = 66 * state.mods.smokeRadiusMult;
  state.smokesActive.push({ x: p.x, y: p.y, r: 16, maxR, timer: dur, duration: dur, alpha: 0.92 });
  spawnSparks(state, p.x, p.y, '#a78bfa', 14);
  if (sound) sound.smokeHiss();
  if (onToast) onToast('VELVET SMOKE DEPLOYED — SIGHTLINES BLOCKED');
  return true;
}

export function spawnSparks(state, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const sp = 28 + Math.random() * 68;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.55 + Math.random() * 0.35,
      maxLife: 0.9,
      color,
      size: 2 + Math.random() * 2.2,
    });
  }
}

export function updateEffects(state, dt, sound) {
  // Flying coins -> land with acoustic ripples + lure guards
  for (let i = state.coinsInFlight.length - 1; i >= 0; i--) {
    const c = state.coinsInFlight[i];
    c.t += dt;
    if (c.t >= c.dur) {
      const lureR = 162 * state.mods.lureRadiusMult;
      state.ripples.push(
        { x: c.tx, y: c.ty, r: 12, maxR: lureR, alpha: 0.95, kind: 'coin', label: 'CLINK!' },
        { x: c.tx, y: c.ty, r: 4, maxR: lureR * 0.68, alpha: 0.85, kind: 'coin' }
      );
      spawnSparks(state, c.tx, c.ty, '#f2cc78', 8);
      if (sound) sound.coinClink();
      alertGuardsToSound(state, c.tx, c.ty, lureR, true, sound);
      state.coinsInFlight.splice(i, 1);
    }
  }

  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const rp = state.ripples[i];
    rp.r += (rp.maxR - rp.r) * Math.min(1, dt * 3.4) + 28 * dt;
    rp.alpha -= dt * (rp.kind === 'coin' ? 0.52 : 0.9);
    if (rp.alpha <= 0.02 || rp.r >= rp.maxR) state.ripples.splice(i, 1);
  }

  for (let i = state.smokesActive.length - 1; i >= 0; i--) {
    const sm = state.smokesActive[i];
    sm.r += (sm.maxR - sm.r) * Math.min(1, dt * 5.2);
    sm.timer -= dt;
    sm.alpha = sm.timer < 1.5 ? Math.max(0, (sm.timer / 1.5) * 0.9) : 0.9;
    if (sm.timer <= 0) state.smokesActive.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
}

export function computeGhostGrade(alerts, recoveries, relicsCount) {
  if (alerts === 0) return { grade: 'S', title: 'VELVET PHANTOM', mult: 2.5 };
  if (alerts === 1) return { grade: 'A', title: 'MIDNIGHT OPERATIVE', mult: 1.8 };
  if (alerts <= 3) return { grade: 'B', title: 'SHADOW RUNNER', mult: 1.3 };
  return { grade: 'C', title: 'CURFEW BREAKER', mult: 1.0 + Math.min(0.2, recoveries * 0.05 + relicsCount * 0.05) };
}
