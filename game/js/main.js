// Velvet Curfew v2b — Main Engine, Controls & 4-Shot Original Art-Deco Museum Showcase

import { PERKS, STAGE_H, STAGE_W, WINGS } from './levels.js';
import { buildSegments, computeVisionPolygon } from './vision.js';
import { createCameras, createGuards, createTripwires, updateSecurity } from './patrol.js';
import {
  claimSapphire, computeMods, evaluateStealthSurface, popVelvetVeil,
  spawnSparks, tossCoinLure, updateEffects, updatePlayer,
} from './detection.js';
import { renderStage } from './render.js';
import { SoundEngine } from './audio.js';
import { renderDebriefLedger, renderTacticsOverlay, renderWingPicker, setOverlay, syncHud } from './ui.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot'); // 'rotunda' | 'lure' | 'breach' | 'debrief' | null

const input = { keys: new Set() };

const state = {
  mode: 'title', // title | play | tactics | debrief | paused | gameover
  shotMode: shotParam,
  selectedStartWing: 0,
  wingIndex: 0,
  wing: WINGS[0],
  geom: buildSegments(WINGS[0].obstacles),
  time: 0,
  score: 2500,
  ghostBonus: 2500,
  bellCount: 0,
  bellCooldown: 0,
  lockdown: false,
  alerts: 0,
  wingAlerts: 0,
  recoveries: 0,
  coins: 4,
  maxCoins: 4,
  coinsUsed: 0,
  veils: 2,
  maxVeils: 2,
  sapphireTaken: false,
  relicItems: [],
  relicsTaken: 0,
  relicsTotal: 4,
  perks: [],
  mods: computeMods([]),
  campaign: {},
  player: null,
  guards: [],
  cameras: [],
  tripwires: [],
  coinsInFlight: [],
  lastCoinArc: null,
  ripples: [],
  veilsActive: [],
  particles: [],
  trail: [],
  debriefTrail: null,
  lastGlimpse: null,
  bellOrigin: null,
  bellLinks: [],
  detectionState: 'UNSEEN',
  maxSuspicion: 0,
  aim: { x: 410, y: 288, active: false },
  draftOptions: [],
  ribbonTimer: 0,
};

function showRibbon(text, isDanger = false, dur = 3.0) {
  const el = document.getElementById('curfew-ribbon');
  el.textContent = text;
  el.className = `curfew-ribbon${isDanger ? '' : ' info'}`;
  state.ribbonTimer = dur;
}

function hideRibbon() {
  document.getElementById('curfew-ribbon').classList.add('hidden');
}

function loadWing(idx, resetRun = false) {
  state.wingIndex = Math.max(0, Math.min(WINGS.length - 1, idx));
  state.wing = WINGS[state.wingIndex];
  state.geom = buildSegments(state.wing.obstacles);
  if (resetRun) {
    state.score = 0;
    state.alerts = 0;
    state.recoveries = 0;
    state.perks = [];
  }
  state.mods = computeMods(state.perks);
  state.time = 0;
  state.wingAlerts = 0;
  state.bellCount = 0;
  state.bellCooldown = 0;
  state.lockdown = false;
  state.maxCoins = state.wing.coins + state.mods.bonusCoins;
  state.coins = state.maxCoins;
  state.coinsUsed = 0;
  state.maxVeils = state.wing.veils + state.mods.bonusVeils;
  state.veils = state.maxVeils;
  state.sapphireTaken = false;
  state.relicItems = (state.wing.relics || []).map((r) => ({ x: r.x, y: r.y, taken: false }));
  state.relicsTaken = 0;
  state.relicsTotal = state.relicItems.length + 1;
  state.coinsInFlight = [];
  state.lastCoinArc = null;
  state.ripples = [];
  state.veilsActive = [];
  state.particles = [];
  state.trail = [{ x: state.wing.spawn.x, y: state.wing.spawn.y }];
  state.debriefTrail = null;
  state.lastGlimpse = null;
  state.bellOrigin = null;
  state.bellLinks = [];
  state.detectionState = 'UNSEEN';
  state.maxSuspicion = 0;

  state.player = {
    x: state.wing.spawn.x, y: state.wing.spawn.y, r: 10, angle: -0.5,
    crouched: false, hiding: false, inShadow: true, inLight: false,
    inAlcove: false, inSettee: false, inVeil: false, onCarpet: false,
    shadowLingerTimer: 0, noise: 6, exposure: 0.1, stepTimer: 0.1,
  };
  state.guards = createGuards(state.wing, state.geom);
  state.cameras = createCameras(state.wing, state.geom);
  state.tripwires = createTripwires(state.wing);
  evaluateStealthSurface(state, 0);
  hideRibbon();
  syncHud(state);
}

function recomputeAllCones() {
  for (const cam of state.cameras) {
    cam.visionPoly = computeVisionPolygon(cam.x, cam.y, cam.angle, cam.fov, cam.range, state.geom, state.veilsActive);
  }
  for (const g of state.guards) {
    g.visionPoly = computeVisionPolygon(g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, state.geom, state.veilsActive);
  }
}

function handleWingClear() {
  const ghost = state.wingAlerts === 0;
  state.ghostBonus = Math.round((ghost ? 2500 : 900) * state.mods.scoreMult);
  state.score += state.ghostBonus;
  state.campaign[state.wingIndex] = { grade: ghost ? 'S' : 'A', time: state.time };
  state.debriefTrail = {
    points: [...state.trail, { x: state.wing.elevator.x, y: state.wing.elevator.y }],
    pins: [
      { x: state.wing.spawn.x, y: state.wing.spawn.y, label: 'ENTRY', color: '#f0d084', dy: -20 },
      { x: state.wing.sapphire.x, y: state.wing.sapphire.y, label: 'SAPPHIRE', color: '#38bdf8', dy: 24 },
      { x: state.wing.elevator.x, y: state.wing.elevator.y, label: 'EXTRACTED', color: '#34d399', dy: -26 },
    ],
  };
  state.mode = 'debrief';
  renderDebriefLedger(state, (idx) => { loadWing(idx, false); state.mode = 'play'; setOverlay('play'); });
  setOverlay('play');
  syncHud(state);
}

function handleCaught(guard) {
  spawnSparks(state, state.player.x, state.player.y, '#e11d48', 18);
  state.mode = 'gameover';
  document.getElementById('gameover-reason').textContent = `Detained by ${guard.spec.name} inside ${state.wing.title}.`;
  setOverlay('gameover');
}

function advanceOrDraft() {
  if (state.wingIndex >= WINGS.length - 1) {
    loadWing(0, true); state.mode = 'play'; setOverlay('play'); return;
  }
  loadWing(state.wingIndex + 1, false);
  const owned = new Set(state.perks.map((p) => p.id));
  state.draftOptions = PERKS.filter((p) => !owned.has(p.id)).slice(0, 3);
  if (state.draftOptions.length) {
    state.mode = 'tactics';
    renderTacticsOverlay(state, (pk) => {
      state.perks.push(pk);
      loadWing(state.wingIndex, false);
      state.mode = 'play';
      setOverlay('play');
      showRibbon(`EQUIPPED ${pk.name.toUpperCase()} — WING ${state.wing.roman}`, false);
    });
    setOverlay('tactics');
  } else {
    state.mode = 'play';
    setOverlay('play');
  }
}

// 4 Distinct 100% Original Art-Deco Museum Showcase States
function applyShotPreset(shot) {
  if (shot === 'rotunda') {
    // 01-rotunda.jpg (HERO COVER): Wing I Grand Rotunda — UNSEEN opening showcase!
    loadWing(0, true);
    state.mode = 'play';
    state.time = 34;
    state.score = 2500;
    state.relicsTaken = 1;
    state.relicItems[0].taken = true;
    state.coins = 4; state.veils = 2;
    state.detectionState = 'UNSEEN';

    // Thief slipping through lower-left shadow alcove behind crimson velvet settee & marble column
    state.player.x = 224;
    state.player.y = 350;
    state.player.angle = -0.35;
    state.player.crouched = true;
    state.player.noise = 8;

    // Dramatic warm golden lantern cones sliced cleanly by octagonal ivory-marble columns & mahogany vitrines!
    state.guards[0].x = 342; state.guards[0].y = 408; state.guards[0].angle = -2.06; state.guards[0].state = 'PATROL';
    state.guards[1].x = 576; state.guards[1].y = 288; state.guards[1].angle = 2.98; state.guards[1].state = 'PATROL';
    state.guards[2].x = 408; state.guards[2].y = 122; state.guards[2].angle = 0.72; state.guards[2].state = 'PATROL';
    state.cameras[0].angle = 2.48;
    state.tripwires[0].active = true;

    evaluateStealthSurface(state, 0);
    recomputeAllCones();
    setOverlay('play');
    hideRibbon();
    syncHud(state);
    return;
  }

  if (shot === 'lure') {
    // 02-lure.jpg: Wing II Velvet Promenade — CURIOUS · ? Brass Coin Lure (CLINK! arc + FOOTSTEP?) + Laser Tripwire!
    loadWing(1, true);
    state.mode = 'play';
    state.time = 58;
    state.score = 3200;
    state.relicsTaken = 1;
    state.relicItems[0].taken = true;
    state.coins = 3; state.coinsUsed = 1; state.veils = 2;
    state.detectionState = 'CURIOUS';

    // Thief crouched safely behind crimson velvet settee & bronze folding screen tossing Brass Coin Lure!
    state.player.x = 256;
    state.player.y = 432;
    state.player.angle = -0.45;
    state.player.crouched = true;
    state.player.noise = 10;

    // Visible golden parabolic toss arc from thief to landing coin + concentric brass ripples + CLINK!
    state.lastCoinArc = { sx: 262, sy: 428, tx: 374, ty: 382, alpha: 0.92 };
    state.ripples = [
      { x: 374, y: 382, r: 34, maxR: 155, alpha: 0.94, kind: 'coin', label: 'CLINK!' },
      { x: 374, y: 382, r: 82, maxR: 155, alpha: 0.56, kind: 'coin' },
    ];

    // Curious Curator turning warm amber cone sharply toward coin ("FOOTSTEP?")
    const g0 = state.guards[0];
    g0.x = 370; g0.y = 266; g0.angle = 1.54;
    g0.state = 'CURIOUS'; g0.suspicion = 0.64;
    g0.lurePos = { x: 374, y: 382 };
    g0.callout = 'FOOTSTEP?';

    state.guards[1].x = 216; state.guards[1].y = 110; state.guards[1].angle = 0.3; state.guards[1].state = 'PATROL';
    state.guards[2].x = 642; state.guards[2].y = 356; state.guards[2].angle = 3.05; state.guards[2].state = 'PATROL';
    state.guards[3].x = 534; state.guards[3].y = 486; state.guards[3].angle = 3.0; state.guards[3].state = 'PATROL';

    state.cameras[0].angle = 2.42;
    state.tripwires[0].active = true;

    evaluateStealthSurface(state, 0);
    recomputeAllCones();
    setOverlay('play');
    hideRibbon();
    syncHud(state);
    return;
  }

  if (shot === 'breach') {
    // 03-breach.jpg: Wing III Vault Vestibule — CURFEW BREACH · ! Escape after snatching Star Sapphire + Velvet Veil + LAST GLIMPSE!
    loadWing(2, true);
    state.mode = 'play';
    state.time = 74;
    state.score = 4650;
    state.sapphireTaken = true;
    state.relicsTaken = 3;
    state.relicItems[0].taken = true;
    state.relicItems[1].taken = true;
    state.coins = 2; state.veils = 1;
    state.wingAlerts = 1;
    state.bellCount = 1;
    state.detectionState = 'BREACH';

    // Thief has snatched the Star Sapphire, popped Velvet Smoke Veil across crimson carpet, and is sprinting toward Brass Elevator!
    state.player.x = 612;
    state.player.y = 294;
    state.player.angle = 0.0;
    state.player.crouched = false;
    state.player.noise = 76;

    // Billowing violet-silver Velvet Smoke Veil breaking Inspector's crimson cone right down the center carpet!
    state.veilsActive = [
      { x: 468, y: 286, r: 64, maxR: 66, timer: 4.5, duration: 6.8, alpha: 0.92 },
    ];

    // Translucent cyan ghost silhouette at LAST GLIMPSE inside the central vestibule
    state.lastGlimpse = { x: 404, y: 288, angle: 0.05 };

    // Chief Inspector sounding Curfew Bell with crimson cone sliced by the Velvet Smoke Veil!
    const g0 = state.guards[0];
    g0.x = 292; g0.y = 286; g0.angle = 0.04;
    g0.state = 'BREACH'; g0.suspicion = 1.0;

    // Converging Docent (north arch) & Curator (south arch) sweeping toward LAST GLIMPSE!
    const g1 = state.guards[1];
    g1.x = 412; g1.y = 114; g1.angle = 1.56;
    g1.state = 'SWEEPING'; g1.callout = 'CONVERGING';

    const g2 = state.guards[2];
    g2.x = 412; g2.y = 462; g2.angle = -1.56;
    g2.state = 'SWEEPING'; g2.callout = 'CONVERGING';

    state.guards[3].x = 716; state.guards[3].y = 478; state.guards[3].angle = -1.62; state.guards[3].state = 'PATROL';

    state.bellOrigin = { x: 292, y: 286 };
    state.bellLinks = [
      { x1: 292, y1: 286, x2: g1.x, y2: g1.y },
      { x1: 292, y1: 286, x2: g2.x, y2: g2.y },
    ];
    state.cameras[0].angle = 2.38;
    state.tripwires[0].active = true;

    evaluateStealthSurface(state, 0);
    recomputeAllCones();
    setOverlay('play');
    showRibbon('CURFEW BELL! Slip behind marble cover or pop Velvet Veil [E].', true, 99);
    syncHud(state);
    return;
  }

  if (shot === 'debrief') {
    // 04-debrief.jpg: Split 75% Completed Grand Rotunda Map w/ Dashed Gold Infiltration Trail + 25% Art-Deco Debrief Ledger!
    loadWing(0, true);
    state.mode = 'debrief';
    state.time = 78;
    state.score = 4850;
    state.ghostBonus = 2500;
    state.sapphireTaken = true;
    state.relicItems.forEach((r) => { r.taken = true; });
    state.relicsTaken = 4;
    state.relicsTotal = 4;
    state.coinsUsed = 2;
    state.wingAlerts = 0;
    state.campaign = {
      0: { grade: 'S', time: 78 },
    };

    // Completed Grand Rotunda patrol positions (calm gold cones still visible beneath the golden route!)
    state.guards[0].x = 342; state.guards[0].y = 410; state.guards[0].angle = -2.35;
    state.guards[1].x = 572; state.guards[1].y = 336; state.guards[1].angle = 2.85;
    state.guards[2].x = 310; state.guards[2].y = 122; state.guards[2].angle = 0.25;
    state.cameras[0].angle = 2.52;

    // Gorgeous dashed gold infiltration trail tracing a 100% legal route through curved archways!
    state.debriefTrail = {
      points: [
        { x: 74, y: 492 }, { x: 86, y: 440 }, { x: 242, y: 422 },
        { x: 244, y: 348 }, { x: 246, y: 170 }, { x: 246, y: 118 },
        { x: 356, y: 118 }, { x: 410, y: 190 }, { x: 410, y: 288 },
        { x: 454, y: 288 }, { x: 454, y: 222 }, { x: 572, y: 196 },
        { x: 572, y: 112 }, { x: 678, y: 80 }, { x: 748, y: 74 },
      ],
      pins: [
        { x: 74, y: 492, label: 'ENTRY', color: '#f0d084', dy: -20 },
        { x: 244, y: 348, label: 'SETTEE COVER', color: '#38bdf8', dy: 22 },
        { x: 246, y: 118, label: 'CLINK! LURE', color: '#f59e0b', dy: -20 },
      ],
    };

    recomputeAllCones();
    renderDebriefLedger(state, () => {});
    setOverlay('play');
    hideRibbon();
    syncHud(state);
  }
}

// Event bindings
function selectWing(idx) {
  state.selectedStartWing = idx;
  loadWing(idx, true);
  renderWingPicker(idx, selectWing);
}

document.getElementById('btn-start').onclick = () => {
  sound.unlock();
  loadWing(state.selectedStartWing, true);
  state.mode = 'play';
  setOverlay('play');
  showRibbon(`WING ${state.wing.roman} · ${state.wing.title} — STAY UNSEEN`, false);
};
document.getElementById('btn-next-wing').onclick = () => { sound.unlock(); advanceOrDraft(); };
document.getElementById('btn-retry-deb').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-title-deb').onclick = () => { state.mode = 'title'; renderWingPicker(state.wingIndex, selectWing); setOverlay('title'); syncHud(state); };
document.getElementById('btn-resume').onclick = () => { state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-restart-pause').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-retry-go').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-title-go').onclick = () => { state.mode = 'title'; renderWingPicker(state.wingIndex, selectWing); setOverlay('title'); syncHud(state); };
document.getElementById('btn-mute').onclick = () => {
  sound.unlock();
  document.getElementById('btn-mute').textContent = sound.toggleMute() ? 'MUTED' : 'SFX';
};

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.aim.x = ((e.clientX - r.left) / r.width) * STAGE_W;
  state.aim.y = ((e.clientY - r.top) / r.height) * STAGE_H;
  state.aim.active = true;
});
canvas.addEventListener('mouseleave', () => { state.aim.active = false; });
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || state.mode !== 'play') return;
  sound.unlock();
  const r = canvas.getBoundingClientRect();
  tossCoinLure(state, ((e.clientX - r.left) / r.width) * STAGE_W, ((e.clientY - r.top) / r.height) * STAGE_H, sound, showRibbon);
  syncHud(state);
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  input.keys.add(e.code);

  if (e.code === 'KeyM') { sound.unlock(); document.getElementById('btn-mute').textContent = sound.toggleMute() ? 'MUTED' : 'SFX'; return; }
  if (state.mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) { document.getElementById('btn-start').click(); return; }
  if (state.mode === 'debrief' && e.code === 'Enter') { advanceOrDraft(); return; }
  if ((state.mode === 'debrief' || state.mode === 'gameover') && e.code === 'KeyR') { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); return; }
  if (state.mode === 'tactics') {
    const idx = e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : e.code === 'Digit3' ? 2 : -1;
    if (idx >= 0 && state.draftOptions[idx]) {
      state.perks.push(state.draftOptions[idx]);
      loadWing(state.wingIndex, false);
      state.mode = 'play';
      setOverlay('play');
    }
    return;
  }
  if (state.mode === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) { state.mode = 'play'; setOverlay('play'); return; }
  if (state.mode !== 'play') return;

  sound.unlock();
  if (e.code === 'KeyP' || e.code === 'Escape') { state.mode = 'paused'; setOverlay('paused'); }
  else if (e.code === 'KeyR') { loadWing(state.wingIndex, false); showRibbon(`WING ${state.wing.roman} RESTARTED`, false); }
  else if (e.code === 'KeyE') { popVelvetVeil(state, sound, showRibbon); syncHud(state); }
  else if (e.code === 'KeyQ' || e.code === 'Space') {
    const tx = state.aim.active ? state.aim.x : state.player.x + Math.cos(state.player.angle) * 140;
    const ty = state.aim.active ? state.aim.y : state.player.y + Math.sin(state.player.angle) * 140;
    tossCoinLure(state, tx, ty, sound, showRibbon);
    syncHud(state);
  } else if (e.code === 'KeyF') {
    const p = state.player;
    if (!state.sapphireTaken && Math.hypot(p.x - state.wing.sapphire.x, p.y - state.wing.sapphire.y) < 54 + state.mods.lootRangeBonus) {
      claimSapphire(state, sound, showRibbon);
    } else {
      p.hiding = !p.hiding;
      showRibbon(p.hiding ? 'CROUCH STANCE LOCKED' : 'UPRIGHT STANCE', false, 1.4);
    }
    syncHud(state);
  }
});
window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });

// Initialize
if (shotParam && ['rotunda', 'lure', 'breach', 'debrief'].includes(shotParam)) {
  applyShotPreset(shotParam);
} else {
  loadWing(0, true);
  state.mode = 'title';
  renderWingPicker(0, selectWing);
  setOverlay('title');
}

// 60 FPS Main Loop
let lastTs = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  if (!state.shotMode) {
    if (state.mode === 'play') {
      state.time += dt;
      updatePlayer(state, input, dt, sound, showRibbon, handleWingClear);
      updateSecurity(state, dt, sound, handleCaught, showRibbon);
      updateEffects(state, dt, sound);
      if (state.lockdown) {
        state.mode = 'gameover';
        document.getElementById('gameover-reason').textContent = '3 Curfew Bells tolled — Museum lockdown sealed every exit.';
        setOverlay('gameover');
      }
      if (state.ribbonTimer > 0) {
        state.ribbonTimer -= dt;
        if (state.ribbonTimer <= 0) hideRibbon();
      }
      syncHud(state);
    } else if (state.mode === 'title' || state.mode === 'tactics') {
      state.time += dt * 0.5;
      updateSecurity(state, dt * 0.5, null, null, null);
    }
  }

  renderStage(ctx, state, state.shotMode ? 1.8 : ts / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
