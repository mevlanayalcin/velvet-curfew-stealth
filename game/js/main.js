// Velvet Curfew — Main Loop, Controls & Deterministic ?shot= Showcase Engine

import { PERKS, STAGE_H, STAGE_W, WINGS } from './levels.js';
import { buildSegments, computeVisionPolygon } from './vision.js';
import { createGuards, updateGuards } from './patrol.js';
import {
  claimLedger,
  claimRelic,
  computeMods,
  deploySmoke,
  evaluateStealthSurface,
  spawnSparks,
  throwCoin,
  updateEffects,
  updatePlayer,
} from './detection.js';
import { renderStage } from './render.js';
import { SoundEngine } from './audio.js';
import {
  renderGameOverOverlay,
  renderTacticsOverlay,
  renderVictoryOverlay,
  renderWingPicker,
  setOverlay,
  syncHud,
} from './ui.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot'); // 'play' | 'title' | 'tactics' | 'victory' | null

const input = { keys: new Set() };

const state = {
  mode: 'title',
  shotMode: shotParam,
  selectedStartWing: 0,
  wingIndex: 0,
  wing: WINGS[0],
  geom: buildSegments(WINGS[0].obstacles),
  time: 0,
  score: 0,
  wingScores: [],
  integrity: 3,
  maxIntegrity: 3,
  alerts: 0,
  wingAlerts: 0,
  recoveries: 0,
  relicsTotal: 0,
  coins: 4,
  maxCoins: 4,
  smokes: 2,
  maxSmokes: 2,
  ledgerStolen: false,
  relicStolen: false,
  perks: [],
  mods: computeMods([]),
  player: null,
  guards: [],
  coinsInFlight: [],
  ripples: [],
  smokesActive: [],
  particles: [],
  aim: { x: 334, y: 284, active: false },
  draftOptions: [],
  lastWingBonus: 1200,
  maxSuspicion: 0,
  anyAlert: false,
  toastTimer: 0,
};

function showToast(text, dur = 2.6) {
  const el = document.getElementById('toast-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  state.toastTimer = dur;
}

function loadWing(idx, resetRun = false) {
  state.wingIndex = Math.max(0, Math.min(WINGS.length - 1, idx));
  state.wing = WINGS[state.wingIndex];
  state.geom = buildSegments(state.wing.obstacles);
  if (resetRun) {
    state.score = 0;
    state.alerts = 0;
    state.recoveries = 0;
    state.relicsTotal = 0;
    state.wingScores = [];
    state.perks = [];
  }
  state.mods = computeMods(state.perks);
  state.time = 0;
  state.wingAlerts = 0;
  state.maxIntegrity = 3 + state.mods.bonusIntegrity;
  state.integrity = state.maxIntegrity;
  state.maxCoins = state.wing.coins + state.mods.bonusCoins;
  state.coins = state.maxCoins;
  state.maxSmokes = state.wing.smokes + state.mods.bonusSmokes;
  state.smokes = state.maxSmokes;
  state.ledgerStolen = false;
  state.relicStolen = false;
  state.coinsInFlight = [];
  state.ripples = [];
  state.smokesActive = [];
  state.particles = [];
  state.maxSuspicion = 0;
  state.anyAlert = false;

  state.player = {
    x: state.wing.spawn.x,
    y: state.wing.spawn.y,
    r: 10,
    angle: -Math.PI / 4,
    crouched: false,
    hiding: false,
    inShadow: true,
    inLight: false,
    inSmoke: false,
    onCarpet: false,
    shadowLingerTimer: 0,
    sprintTimer: 0,
    noise: 8,
    stepTimer: 0.1,
  };
  state.guards = createGuards(state.wing, state.geom);
  evaluateStealthSurface(state, 0);
  syncHud(state);
}

function pickDraftOptions() {
  const owned = new Set(state.perks.map((p) => p.id));
  const pool = PERKS.filter((p) => !owned.has(p.id));
  if (pool.length <= 3) return pool;
  // Deterministic friendly triad on Wing I->II transition, shuffled variety later
  if (state.wingIndex === 1 && !owned.has('felt-soles') && !owned.has('brass-resonator') && !owned.has('nightshade-veil')) {
    return [PERKS[0], PERKS[1], PERKS[2]];
  }
  const copy = [...pool];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const k = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(k, 1)[0]);
  }
  return out;
}

function handleWingClear() {
  const unseen = state.wingAlerts === 0;
  const wingBonus = Math.round(((unseen ? 1200 : 450) + (unseen ? state.mods.wingBonus : 0)) * state.mods.scoreMult);
  state.lastWingBonus = wingBonus;
  state.score += wingBonus;
  if (state.relicStolen) state.relicsTotal += 1;
  state.wingScores.push({
    numeral: state.wing.numeral,
    shortName: state.wing.shortName,
    score: (state.ledgerStolen ? 1000 : 0) + (state.relicStolen ? 600 : 0) + wingBonus,
    time: state.time,
    unseen,
  });

  if (state.wingIndex >= WINGS.length - 1) {
    state.mode = 'victory';
    renderVictoryOverlay(state);
    setOverlay('victory');
    syncHud(state);
    return;
  }

  loadWing(state.wingIndex + 1, false);
  state.draftOptions = pickDraftOptions();
  state.mode = 'tactics';
  renderTacticsOverlay(state, choosePerk);
  setOverlay('tactics');
  syncHud(state);
}

function choosePerk(perk) {
  sound.unlock();
  sound.lootChime();
  state.perks.push(perk);
  loadWing(state.wingIndex, false);
  state.mode = 'play';
  setOverlay('play');
  showToast(`EQUIPPED ${perk.name.toUpperCase()} — INFILTRATE WING ${state.wing.numeral}`);
}

function handlePlayerHit(guard) {
  state.integrity = Math.max(0, state.integrity - 1);
  spawnSparks(state, state.player.x, state.player.y, '#ef4444', 18);
  sound.alertSiren();
  if (state.integrity <= 0) {
    state.mode = 'gameover';
    renderGameOverOverlay(state, `Apprehended by ${guard.spec.name} in ${state.wing.name}.`);
    setOverlay('gameover');
  } else {
    showToast(`INTEGRITY HIT (${state.integrity}/${state.maxIntegrity}) — BREAK SIGHTLINE!`);
  }
  syncHud(state);
}

function startFromTitle() {
  sound.unlock();
  loadWing(state.selectedStartWing, true);
  state.mode = 'play';
  setOverlay('play');
  showToast(`WING ${state.wing.numeral}: CLAIM THE VAULT LEDGER UNSEEN`);
}

// Configure deterministic showcase frames using the real live simulation & renderer
function applyShotPreset(shot) {
  if (shot === 'title') {
    loadWing(0, true);
    state.mode = 'title';
    renderWingPicker(0, () => {});
    setOverlay('title');
    // Sweep guards dynamically across meridian rotunda behind title card
    updateGuards(state, 0.016, null, null, null);
    syncHud(state);
    return;
  }

  if (shot === 'play') {
    // Hero Action Cover: Mid-heist tension in Meridian Rotunda!
    loadWing(0, true);
    state.perks = [PERKS[0], PERKS[3]]; // Felt Soles + Velvet Cloak
    state.mods = computeMods(state.perks);
    state.mode = 'play';
    state.time = 42;
    state.score = 4850;
    state.recoveries = 2;
    state.alerts = 0;
    state.coins = 3;
    state.maxCoins = 4;
    state.smokes = 1;
    state.maxSmokes = 2;
    state.ledgerStolen = true;
    state.relicStolen = false;

    // Infiltrator crouched safely in indigo shadow behind southwest marble pillar
    state.player.x = 178;
    state.player.y = 382;
    state.player.angle = -0.35;
    state.player.crouched = true;
    state.player.noise = 12;

    // Active Velvet Smoke cloud slicing Night Captain's eastern sightline
    state.smokesActive = [
      { x: 462, y: 162, r: 54, maxR: 56, timer: 4.6, duration: 6.5, alpha: 0.88 },
    ];

    // Guard 0: Suspicious (?) Lantern Warden drawn by chiming Brass Coin Lure, cone split dramatically by pillar!
    const g0 = state.guards[0];
    g0.x = 286; g0.y = 324; g0.angle = 2.66;
    g0.state = 'SUSPICIOUS'; g0.suspicion = 0.68;

    // Guard 1: Calm golden patrol cone sweeping crimson runner, clipped by SE marble pillar
    const g1 = state.guards[1];
    g1.x = 502; g1.y = 304; g1.angle = 2.92;
    g1.state = 'PATROL'; g1.suspicion = 0;

    // Guard 2: Night Captain sweeping broad lantern arc across upper rotunda, right edge occluded by Velvet Smoke!
    const g2 = state.guards[2];
    g2.x = 322; g2.y = 136; g2.angle = 0.62;
    g2.state = 'PATROL'; g2.suspicion = 0;

    // Concentric dashed Brass Coin Lure acoustic ripple rings
    state.ripples = [
      { x: 256, y: 424, r: 24, maxR: 150, alpha: 0.94, kind: 'coin', label: 'CLINK!' },
      { x: 256, y: 424, r: 58, maxR: 150, alpha: 0.68, kind: 'coin' },
      { x: 256, y: 424, r: 96, maxR: 150, alpha: 0.38, kind: 'coin' },
    ];

    for (const g of state.guards) {
      g.visionPoly = computeVisionPolygon(g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, state.geom, state.smokesActive);
    }
    state.maxSuspicion = 0.68;
    evaluateStealthSurface(state, 0);
    setOverlay('play');
    document.getElementById('toast-banner').classList.add('hidden');
    syncHud(state);
    return;
  }

  if (shot === 'tactics') {
    loadWing(1, true);
    state.score = 3450;
    state.recoveries = 2;
    state.alerts = 0;
    state.lastWingBonus = 1200;
    state.perks = [PERKS[3]];
    state.draftOptions = [PERKS[0], PERKS[1], PERKS[2]];
    state.mode = 'tactics';
    updateGuards(state, 0.016, null, null, null);
    renderTacticsOverlay(state, choosePerk);
    setOverlay('tactics');
    syncHud(state);
    return;
  }

  if (shot === 'victory') {
    loadWing(4, true);
    state.ledgerStolen = true;
    state.relicStolen = true;
    state.alerts = 0;
    state.recoveries = 3;
    state.relicsTotal = 4;
    state.score = 18450;
    state.time = 194;
    state.perks = [PERKS[0], PERKS[1], PERKS[2]];
    state.wingScores = [
      { numeral: 'I', shortName: 'Rotunda', score: 3150, time: 36, unseen: true },
      { numeral: 'II', shortName: 'Archive', score: 3480, time: 41, unseen: true },
      { numeral: 'III', shortName: 'Conservatory', score: 3720, time: 39, unseen: true },
      { numeral: 'IV', shortName: 'Gallery', score: 3850, time: 44, unseen: true },
      { numeral: 'V', shortName: 'Vault', score: 4250, time: 34, unseen: true },
    ];
    state.mode = 'victory';
    updateGuards(state, 0.016, null, null, null);
    renderVictoryOverlay(state);
    setOverlay('victory');
    syncHud(state);
  }
}

// Event Listeners
document.getElementById('btn-start').onclick = startFromTitle;
document.getElementById('btn-resume').onclick = () => { state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-restart-pause').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-retry-wing').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-back-title').onclick = () => {
  state.mode = 'title';
  renderWingPicker(state.selectedStartWing, selectWing);
  setOverlay('title');
};
document.getElementById('btn-play-again').onclick = () => {
  state.selectedStartWing = 0;
  startFromTitle();
};
document.getElementById('btn-next-or-title').onclick = () => {
  state.mode = 'title';
  renderWingPicker(state.selectedStartWing, selectWing);
  setOverlay('title');
};
document.getElementById('btn-mute').onclick = () => {
  sound.unlock();
  const muted = sound.toggleMute();
  document.getElementById('btn-mute').textContent = muted ? 'SFX OFF' : 'SFX ON';
};

function selectWing(idx) {
  state.selectedStartWing = idx;
  loadWing(idx, true);
  renderWingPicker(idx, selectWing);
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  state.aim.x = ((e.clientX - rect.left) / rect.width) * STAGE_W;
  state.aim.y = ((e.clientY - rect.top) / rect.height) * STAGE_H;
  state.aim.active = true;
});
canvas.addEventListener('mouseleave', () => { state.aim.active = false; });
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || state.mode !== 'play') return;
  sound.unlock();
  const rect = canvas.getBoundingClientRect();
  const tx = ((e.clientX - rect.left) / rect.width) * STAGE_W;
  const ty = ((e.clientY - rect.top) / rect.height) * STAGE_H;
  throwCoin(state, tx, ty, sound, showToast);
  syncHud(state);
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  input.keys.add(e.code);

  if (e.code === 'KeyM') {
    sound.unlock();
    const muted = sound.toggleMute();
    document.getElementById('btn-mute').textContent = muted ? 'SFX OFF' : 'SFX ON';
    return;
  }

  if (state.mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) {
    startFromTitle();
    return;
  }
  if (state.mode === 'tactics') {
    if (e.code === 'Digit1' && state.draftOptions[0]) choosePerk(state.draftOptions[0]);
    if (e.code === 'Digit2' && state.draftOptions[1]) choosePerk(state.draftOptions[1]);
    if (e.code === 'Digit3' && state.draftOptions[2]) choosePerk(state.draftOptions[2]);
    return;
  }
  if (state.mode === 'gameover' && e.code === 'KeyR') {
    loadWing(state.wingIndex, false);
    state.mode = 'play';
    setOverlay('play');
    return;
  }
  if (state.mode === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) {
    state.mode = 'play';
    setOverlay('play');
    return;
  }
  if (state.mode !== 'play') return;

  sound.unlock();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    state.mode = 'paused';
    setOverlay('paused');
  } else if (e.code === 'KeyR') {
    loadWing(state.wingIndex, false);
    showToast(`WING ${state.wing.numeral} RESTARTED`);
  } else if (e.code === 'KeyQ') {
    deploySmoke(state, sound, showToast);
    syncHud(state);
  } else if (e.code === 'Space') {
    const tx = state.aim.active ? state.aim.x : state.player.x + Math.cos(state.player.angle) * 125;
    const ty = state.aim.active ? state.aim.y : state.player.y + Math.sin(state.player.angle) * 125;
    throwCoin(state, tx, ty, sound, showToast);
    syncHud(state);
  } else if (e.code === 'KeyE') {
    const p = state.player;
    const pickR = 52 + state.mods.lootRangeBonus;
    if (!state.ledgerStolen && Math.hypot(p.x - state.wing.ledger.x, p.y - state.wing.ledger.y) < pickR) {
      claimLedger(state, sound, showToast);
    } else if (state.wing.relic && !state.relicStolen && Math.hypot(p.x - state.wing.relic.x, p.y - state.wing.relic.y) < pickR) {
      claimRelic(state, sound, showToast);
    } else {
      p.hiding = !p.hiding;
      showToast(p.hiding ? 'CROUCH-HIDE TOGGLED ON' : 'STANDING STANCE');
    }
    syncHud(state);
  }
});

window.addEventListener('keyup', (e) => {
  input.keys.delete(e.code);
});

// Initialize
if (shotParam && ['play', 'title', 'tactics', 'victory'].includes(shotParam)) {
  applyShotPreset(shotParam);
} else {
  loadWing(0, true);
  state.mode = 'title';
  renderWingPicker(0, selectWing);
  setOverlay('title');
}

// Main 60 FPS Loop (freezes exact deterministic moment for ?shot= captures)
let lastTs = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  if (!state.shotMode) {
    if (state.mode === 'play') {
      state.time += dt;
      updatePlayer(state, input, dt, sound, showToast, handleWingClear);
      updateGuards(state, dt, sound, handlePlayerHit, showToast);
      updateEffects(state, dt, sound);
      if (state.toastTimer > 0) {
        state.toastTimer -= dt;
        if (state.toastTimer <= 0) document.getElementById('toast-banner').classList.add('hidden');
      }
      syncHud(state);
    } else if (state.mode === 'title' || state.mode === 'tactics' || state.mode === 'victory') {
      // Animate patrolling guards in background behind overlays for living atmosphere
      updateGuards(state, dt * 0.65, null, null, null);
    }
  }

  renderStage(ctx, state, state.shotMode ? 2.4 : ts / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
