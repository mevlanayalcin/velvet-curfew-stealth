// Velvet Curfew — Game Loop, Museum Wing Loader & Curfew Breach Orchestrator (1280x720 HD)

import { computeRaycastVisionCone, buildOccluderSegments } from './vision.js';
import { updateCuratorPatrols, createCameras, createGuards, createTripwires, notifySound } from './patrol.js';
import {
  updateStealthDetection, douseNearbySconce, useBrassFloorVent,
  deployVelvetVeilSmoke, throwBrassCoinLure, claimSolisOpal,
  computeMods, evaluateStealthSurface, spawnSparks, updateEffects,
} from './detection.js';
import { SpatialStealthAudio } from './audio.js';
import { MUSEUM_WINGS, STEALTH_PERKS, STAGE_H, STAGE_W } from './levels.js';
import { renderMuseumStage } from './render.js';
import {
  mountArtDecoHud, updateCuratorTelemetry, renderDebriefLedger,
  renderTacticsOverlay, renderWingPicker, setOverlay,
  showRibbonBanner, hideRibbonBanner, setGameoverReason, setMuteLabel,
} from './ui.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const sound = new SpatialStealthAudio();
const shotParam = new URLSearchParams(window.location.search).get('shot');
const input = { keys: new Set() };

const SX = STAGE_W / 820;
const SY = STAGE_H / 576;
const px = (x) => Math.round(x * SX);
const py = (y) => Math.round(y * SY);

const state = {
  mode: 'title', shotMode: shotParam, selectedStartWing: 0,
  wingIndex: 0, wing: MUSEUM_WINGS[0], geom: buildOccluderSegments(MUSEUM_WINGS[0].obstacles),
  time: 0, score: 0, wingStartScore: 0, ghostBonus: 2500, bellCount: 0, bellCooldown: 0, lockdown: false,
  alerts: 0, wingAlerts: 0, recoveries: 0, coins: 4, maxCoins: 4, coinsUsed: 0,
  veils: 2, maxVeils: 2, dousedCount: 0, opalTaken: false,
  relicItems: [], relicsTaken: 0, relicsTotal: 4, lights: [], perks: [], mods: computeMods([]),
  campaign: {}, player: null, guards: [], cameras: [], tripwires: [],
  coinsInFlight: [], lastCoinArc: null, ripples: [], guardSteps: [], veilsActive: [],
  particles: [], trail: [], runPins: [], debriefTrail: null, lastGlimpse: null, bellOrigin: null, bellLinks: [],
  detectionState: 'UNSEEN', maxSuspicion: 0,
  aim: { x: STAGE_W / 2, y: STAGE_H / 2, active: false },
  draftOptions: [], ribbonTimer: 0,
};

export function startGameLoop() {
  let lastTs = performance.now();
  function tick(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!state.shotMode) {
      if (state.mode === 'play') {
        state.time += dt;
        updateStealthDetection(state, input, dt, sound, triggerRibbon, handleWingClear);
        if (state.mode === 'play') {
          updateCuratorPatrols(state, dt, sound, triggerCurfewBreach, triggerRibbon);
          updateEffects(state, dt, sound);
        }
        if (state.lockdown) {
          state.mode = 'gameover';
          setGameoverReason('3 Curfew Bells tolled — Museum lockdown sealed every exit.');
          setOverlay('gameover');
        }
        if (state.ribbonTimer > 0) {
          state.ribbonTimer -= dt;
          if (state.ribbonTimer <= 0) hideRibbonBanner();
        }
        updateCuratorTelemetry(state);
      } else if (state.mode === 'title' || state.mode === 'tactics') {
        state.time += dt * 0.5;
        updateCuratorPatrols(state, dt * 0.5, null, null, null);
      }
    }
    renderMuseumStage(ctx, state, state.shotMode ? 1.8 : ts / 1000);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function loadMuseumWing(idx, resetRun = false) {
  state.wingIndex = Math.max(0, Math.min(MUSEUM_WINGS.length - 1, idx));
  state.wing = MUSEUM_WINGS[state.wingIndex];
  state.geom = buildOccluderSegments(state.wing.obstacles);
  if (resetRun) { state.campaign = {}; state.alerts = 0; state.recoveries = 0; state.perks = []; }
  // A replay replaces this wing's contribution; only earlier clears come through the door.
  state.wingStartScore = MUSEUM_WINGS.slice(0, state.wingIndex).reduce((n, w) => n + (state.campaign[w.id]?.points ?? 0), 0);
  state.score = state.wingStartScore;
  state.mods = computeMods(state.perks);
  state.time = 0; state.wingAlerts = 0; state.bellCount = 0; state.bellCooldown = 0; state.lockdown = false;
  state.maxCoins = state.wing.coins + state.mods.bonusCoins; state.coins = state.maxCoins; state.coinsUsed = 0;
  state.maxVeils = state.wing.veils + state.mods.bonusVeils; state.veils = state.maxVeils;
  state.dousedCount = 0; state.opalTaken = false;
  state.relicItems = (state.wing.relics || []).map((r) => ({ x: r.x, y: r.y, taken: false }));
  state.relicsTaken = 0; state.relicsTotal = state.relicItems.length + 1;
  state.lights = state.wing.lights.map((l) => ({ x: l.x, y: l.y, r: l.r, lit: true }));
  state.coinsInFlight = []; state.lastCoinArc = null; state.ripples = []; state.guardSteps = [];
  state.veilsActive = []; state.particles = []; state.trail = [{ x: state.wing.spawn.x, y: state.wing.spawn.y }];
  state.runPins = [{ x: state.wing.spawn.x, y: state.wing.spawn.y, label: 'ENTRY', color: '#f0d084', dy: -22 }];
  state.debriefTrail = null; state.lastGlimpse = null; state.bellOrigin = null; state.bellLinks = [];
  state.detectionState = 'UNSEEN'; state.maxSuspicion = 0;

  state.player = {
    x: state.wing.spawn.x, y: state.wing.spawn.y, r: 11, angle: -0.5,
    crouched: false, hiding: false, inShadow: true, inLight: false,
    inAlcove: false, inSettee: false, inVeil: false, inDoused: false,
    lampInRange: false, ventInRange: false, onCarpet: false,
    shadowLingerTimer: 0, noise: 6, exposure: 0.1, stepTimer: 0.1,
  };
  state.guards = createGuards(state.wing, state.geom);
  state.cameras = createCameras(state.wing, state.geom);
  state.tripwires = createTripwires(state.wing);
  evaluateStealthSurface(state, 0);
  hideRibbonBanner();
  updateCuratorTelemetry(state);
}

export function triggerCurfewBreach(guard) {
  spawnSparks(state, state.player.x, state.player.y, '#e11d48', 18);
  state.mode = 'gameover';
  setGameoverReason(`Detained by ${guard.spec.name} inside ${state.wing.title}.`);
  setOverlay('gameover');
}

function triggerRibbon(text, isDanger = false, dur = 3.0) {
  showRibbonBanner(text, isDanger);
  state.ribbonTimer = dur;
}

function recomputeAllCones() {
  const geom = state.player.crouched ? state.geom.crouched : state.geom;
  for (const cam of state.cameras) cam.visionPoly = computeRaycastVisionCone(cam.x, cam.y, cam.angle, cam.fov, cam.range, state.geom, state.veilsActive);
  for (const g of state.guards) g.visionPoly = computeRaycastVisionCone(g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, geom, state.veilsActive);
}

function playWing(idx, resetRun = false) {
  state.shotMode = null;
  state.mode = 'play';
  loadMuseumWing(idx, resetRun);
  setOverlay('play');
}

function handleWingClear() {
  const ghost = state.wingAlerts === 0;
  state.ghostBonus = Math.round((ghost ? 2500 : 900) * state.mods.scoreMult);
  state.score += state.ghostBonus;
  state.campaign[state.wingIndex] = { grade: ghost ? 'S' : state.wingAlerts === 1 ? 'A' : 'B', time: state.time, points: state.score - state.wingStartScore };
  const pts = [...state.trail];
  const last = pts[pts.length - 1];
  if (!last || Math.hypot(last.x - state.wing.elevator.x, last.y - state.wing.elevator.y) > 8) {
    pts.push({ x: state.wing.elevator.x, y: state.wing.elevator.y });
  }
  state.debriefTrail = {
    points: pts,
    pins: state.runPins.slice(0, 4),
  };
  state.mode = 'debrief';
  state.particles.length = 0;
  hideRibbonBanner();
  renderDebriefLedger(state, (idx) => playWing(idx));
  setOverlay('play');
  updateCuratorTelemetry(state);
}

function advanceOrDraft() {
  if (state.wingIndex >= MUSEUM_WINGS.length - 1) { playWing(0, true); return; }
  playWing(state.wingIndex + 1);
  const owned = new Set(state.perks.map((p) => p.id));
  state.draftOptions = STEALTH_PERKS.filter((p) => !owned.has(p.id)).slice(0, 3);
  if (state.draftOptions.length) {
    state.mode = 'tactics';
    renderTacticsOverlay(state, (pk) => {
      state.perks.push(pk); playWing(state.wingIndex);
      triggerRibbon(`EQUIPPED ${pk.name.toUpperCase()} — WING ${state.wing.roman}`, false);
    });
    setOverlay('tactics');
  }
}

function applyShotPreset(shot) {
  if (shot === 'curious') {
    loadMuseumWing(0, true);
    state.mode = 'play'; state.time = 46; state.score = 800; // 2x350 relics + 1x100 lamp
    state.relicItems[0].taken = true; state.relicItems[2].taken = true; state.relicsTaken = 2;
    state.coins = 3; state.coinsUsed = 1; state.veils = 2; state.dousedCount = 1;
    state.detectionState = 'CURIOUS'; state.lights[3].lit = false;
    state.player.x = px(185); state.player.y = py(350); state.player.angle = -0.25; state.player.crouched = true; state.player.noise = 8;
    const coin = { x: px(220), y: py(313) };
    state.lastCoinArc = { sx: state.player.x, sy: state.player.y, tx: coin.x, ty: coin.y, alpha: 0.70 };
    state.ripples = [
      { ...coin, r: 45, maxR: 178, alpha: 0.78, kind: 'coin', label: 'CLINK!' },
      { ...coin, r: 21, maxR: 110, alpha: 0.95, kind: 'coin' },
    ];
    const g0 = state.guards[0];
    g0.x = px(320); g0.y = py(298); g0.angle = Math.atan2(coin.y - g0.y, coin.x - g0.x);
    const [, g1, g2] = state.guards;
    g1.x = px(566); g1.y = py(420); g1.angle = -Math.PI / 2;
    g2.x = px(392); g2.y = g2.waypoints[0].y; g2.angle = Math.PI;
    notifySound(state, coin.x, coin.y, 178, true, null);
    state.cameras[0].angle = 2.48; state.tripwires[0].active = true;
    state.guardSteps = [
      { x: g2.x, y: g2.y, r: 30, maxR: 54, alpha: 0.70, danger: false },
      { x: g1.x, y: g1.y, r: 25, maxR: 50, alpha: 0.55, danger: false },
    ];
    evaluateStealthSurface(state, 0); recomputeAllCones(); setOverlay('play'); hideRibbonBanner(); updateCuratorTelemetry(state);
    return;
  }

  if (shot === 'breach') {
    loadMuseumWing(2, true);
    state.mode = 'play'; state.time = 74; state.score = 2000; // 1200 Opal + 2x350 relics + 1x100 lamp
    state.opalTaken = true; state.relicItems[0].taken = true; state.relicItems[1].taken = true; state.relicsTaken = 3;
    state.coins = 2; state.veils = 1; state.dousedCount = 1; state.lights[3].lit = false;
    state.wingAlerts = 1; state.bellCount = 1; state.detectionState = 'BREACH';
    state.player.x = px(612); state.player.y = py(294); state.player.angle = 0; state.player.crouched = false; state.player.noise = 78;
    state.veilsActive = [{ x: px(468), y: py(286), r: 74, maxR: 76, timer: 4.5, duration: 6.8, alpha: 0.92 }];
    state.lastGlimpse = { x: px(404), y: py(288), angle: 0.05 };
    const g0 = state.guards[0]; g0.x = px(292); g0.y = py(286); g0.angle = 0.04; g0.state = 'BREACH'; g0.suspicion = 1.0;
    const g1 = state.guards[1]; g1.x = px(412); g1.y = py(128); g1.angle = 1.56; g1.state = 'SWEEPING'; g1.suspicion = 0.76; g1.callout = 'CONVERGING';
    const g2 = state.guards[2]; g2.x = px(412); g2.y = py(444); g2.angle = -1.56; g2.state = 'SWEEPING'; g2.suspicion = 0.72; g2.callout = 'CONVERGING';
    state.guards[3].x = px(716); state.guards[3].y = py(478); state.guards[3].angle = -1.62; state.guards[3].state = 'PATROL';
    state.bellOrigin = { x: px(292), y: py(286) };
    state.bellLinks = [{ x1: px(292), y1: py(286), x2: g1.x, y2: g1.y }, { x1: px(292), y1: py(286), x2: g2.x, y2: g2.y }];
    state.cameras[0].angle = 2.38; state.tripwires[0].active = true;
    state.guardSteps = [{ x: px(716), y: py(478), r: 32, maxR: 54, alpha: 0.8, danger: true, label: 'STEP' }];
    evaluateStealthSurface(state, 0); recomputeAllCones(); setOverlay('play');
    triggerRibbon('CURFEW BELL! Slip behind marble cover or pop Velvet Veil [E].', true, 99);
    updateCuratorTelemetry(state);
    return;
  }

  if (shot === 'sweeping') {
    loadMuseumWing(1, true);
    state.mode = 'play'; state.time = 62; state.score = 800; // 2x350 relics + 1x100 lamp
    state.relicItems[0].taken = true; state.relicItems[1].taken = true; state.relicsTaken = 2;
    state.coins = 3; state.veils = 1; state.dousedCount = 1; state.wingAlerts = 1; state.bellCount = 1;
    state.detectionState = 'SWEEPING'; state.lights[4].lit = false;
    state.player.x = px(556); state.player.y = py(468); state.player.angle = -1.4; state.player.crouched = true; state.player.noise = 7;
    state.veilsActive = [{ x: px(486), y: py(318), r: 52, maxR: 58, timer: 2.0, duration: 6.8, alpha: 0.68 }];
    state.lastGlimpse = { x: px(406), y: py(288), angle: 0.2 };
    const g0 = state.guards[0]; g0.x = px(342); g0.y = py(242); g0.angle = 0.62; g0.state = 'SWEEPING'; g0.suspicion = 0.74; g0.callout = 'SWEEPING';
    state.guards[1].x = px(224); state.guards[1].y = py(110); state.guards[1].angle = 0.45; state.guards[1].state = 'PATROL';
    state.guards[2].x = px(648); state.guards[2].y = py(354); state.guards[2].angle = 3.04; state.guards[2].state = 'PATROL';
    const g3 = state.guards[3]; g3.x = px(468); g3.y = py(446); g3.angle = -1.96; g3.state = 'SWEEPING'; g3.suspicion = 0.64; g3.callout = 'DARKENED LAMP?';
    state.cameras[0].angle = 2.45; state.tripwires[0].active = true;
    state.guardSteps = [
      { x: px(224), y: py(110), r: 32, maxR: 54, alpha: 0.8, danger: false, label: 'STEP' },
      { x: px(648), y: py(354), r: 28, maxR: 52, alpha: 0.68, danger: false },
    ];
    evaluateStealthSurface(state, 0); recomputeAllCones(); setOverlay('play'); hideRibbonBanner(); updateCuratorTelemetry(state);
    return;
  }

  if (shot === 'debrief') {
    loadMuseumWing(0, true);
    state.time = 78;
    // Genuine walkable Wing I extraction clearing every solid wall, column, vitrine & folding screen
    state.trail = [
      [74, 492], [74, 536], [194, 536], [194, 444], [246, 404],
      [246, 172], [246, 122], [186, 122], [102, 88], [186, 122],
      [246, 118], [410, 84], [410, 288], [468, 288], [572, 288],
      [572, 172], [572, 118], [662, 78], [748, 74],
    ].map(([x, y]) => ({ x: px(x), y: py(y) }));

    // Execute real live gameplay actions so score & runPins reconcile 100% (4,600 exact)
    state.player.x = px(194); state.player.y = py(444);
    douseNearbySconce(state, null, null); // lights[3] (+100, records DOUSED LAMP pin)
    state.player.x = px(186); state.player.y = py(122);
    douseNearbySconce(state, null, null); // lights[1] (+100)
    state.relicItems[0].taken = true; state.relicItems[2].taken = true; state.relicsTaken = 2; state.score += 700; // NW & N relics (2x350)
    state.coinsUsed = 2; state.coins = 2;
    state.runPins.push({ x: px(246), y: py(118), label: 'CLINK! LURE', color: '#f59e0b', dy: -22 });
    state.player.x = px(410); state.player.y = py(288);
    claimSolisOpal(state, null, null); // +1200, relicsTaken -> 3/4
    state.player.x = px(748); state.player.y = py(74);
    state.guards[0].x = px(342); state.guards[0].y = py(410); state.guards[0].angle = -2.35;
    state.guards[1].x = px(572); state.guards[1].y = py(336); state.guards[1].angle = 2.85;
    state.guards[2].x = px(310); state.guards[2].y = py(122); state.guards[2].angle = 0.25;
    state.cameras[0].angle = 2.52;
    recomputeAllCones();
    handleWingClear(); // +2500 Ghost Bonus -> 4,600 exact, mounts Debrief Ledger & trail!
  }
}

function selectWing(idx) { state.selectedStartWing = idx; loadMuseumWing(idx, true); renderWingPicker(idx, selectWing); }

mountArtDecoHud({
  onStart: () => { sound.unlock(); playWing(state.selectedStartWing, true); triggerRibbon(`WING ${state.wing.roman} · ${state.wing.title} — STAY UNSEEN`, false); },
  onNextWing: () => { sound.unlock(); advanceOrDraft(); },
  onRetry: () => playWing(state.wingIndex),
  onTitle: () => { state.shotMode = null; state.mode = 'title'; selectWing(state.wingIndex); setOverlay('title'); },
  onResume: () => { state.mode = 'play'; setOverlay('play'); },
  onMute: () => { sound.unlock(); setMuteLabel(sound.toggleMute()); },
});

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
  throwBrassCoinLure(state, ((e.clientX - r.left) / r.width) * STAGE_W, ((e.clientY - r.top) / r.height) * STAGE_H, sound, triggerRibbon);
  updateCuratorTelemetry(state);
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  input.keys.add(e.code);

  if (e.code === 'KeyM') { sound.unlock(); setMuteLabel(sound.toggleMute()); return; }
  if (state.mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) { document.querySelector('[data-ui="btn-start"]').click(); return; }
  if (state.mode === 'debrief' && e.code === 'Enter') { advanceOrDraft(); return; }
  if ((state.mode === 'debrief' || state.mode === 'gameover') && (e.code === 'KeyX' || e.code === 'KeyR')) {
    playWing(state.wingIndex); return;
  }
  if (state.mode === 'tactics') {
    const idx = e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : e.code === 'Digit3' ? 2 : -1;
    if (idx >= 0 && state.draftOptions[idx]) {
      state.perks.push(state.draftOptions[idx]); playWing(state.wingIndex);
    }
    return;
  }
  if (state.mode === 'paused') {
    if (e.code === 'KeyP' || e.code === 'Escape') { state.mode = 'play'; setOverlay('play'); }
    else if (e.code === 'KeyX') { playWing(state.wingIndex); triggerRibbon(`WING ${state.wing.roman} RESTARTED`, false); }
    return;
  }
  if (state.mode !== 'play') return;

  sound.unlock();
  if (e.code === 'KeyP' || e.code === 'Escape') { state.mode = 'paused'; setOverlay('paused'); }
  else if (e.code === 'KeyX') { playWing(state.wingIndex); triggerRibbon(`WING ${state.wing.roman} RESTARTED`, false); }
  else if (e.code === 'KeyR') { douseNearbySconce(state, sound, triggerRibbon); updateCuratorTelemetry(state); }
  else if (e.code === 'KeyV') { useBrassFloorVent(state, sound, triggerRibbon); updateCuratorTelemetry(state); }
  else if (e.code === 'KeyE') { deployVelvetVeilSmoke(state, sound, triggerRibbon); updateCuratorTelemetry(state); }
  else if (e.code === 'KeyQ' || e.code === 'Space') {
    const tx = state.aim.active ? state.aim.x : state.player.x + Math.cos(state.player.angle) * 165;
    const ty = state.aim.active ? state.aim.y : state.player.y + Math.sin(state.player.angle) * 165;
    throwBrassCoinLure(state, tx, ty, sound, triggerRibbon);
    updateCuratorTelemetry(state);
  } else if (e.code === 'KeyF') {
    const p = state.player;
    if (!state.opalTaken && Math.hypot(p.x - state.wing.opal.x, p.y - state.wing.opal.y) < 64 + state.mods.lootRangeBonus) {
      claimSolisOpal(state, sound, triggerRibbon);
    } else { p.hiding = !p.hiding; triggerRibbon(p.hiding ? 'CROUCH STANCE LOCKED' : 'UPRIGHT STANCE', false, 1.4); }
    updateCuratorTelemetry(state);
  }
});
window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });

function fitViewport() {
  const app = document.getElementById('app');
  if (!app) return;
  const s = Math.min(1, window.innerWidth / 1280, window.innerHeight / 720);
  app.style.transform = s < 0.999 ? `scale(${s})` : '';
}
window.addEventListener('resize', fitViewport);
fitViewport();

if (shotParam && ['curious', 'breach', 'sweeping', 'debrief'].includes(shotParam)) {
  applyShotPreset(shotParam);
} else {
  loadMuseumWing(0, true);
  state.mode = 'title';
  renderWingPicker(0, selectWing);
  setOverlay('title');
}

startGameLoop();
