// Velvet Curfew — Game Loop, Museum Wing Loader & Curfew Breach Orchestrator (1280x720 HD)

import { computeRaycastVisionCone, buildOccluderSegments } from './vision.js';
import {
  updateCuratorPatrols, updateBrassEyeCameras, createCameras, createGuards, createTripwires, notifySound,
  emitGuardFootstepEcho, fadeFootstepRings,
} from './patrol.js';
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

export {startGameLoop};

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

function startGameLoop() {
  let lastTs = performance.now();
  function tick(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!state.shotMode) {
      if (state.mode === 'play') {
        stepPlay(dt, input, sound, triggerRibbon);
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
    renderMuseumStage(ctx, state, state.mode === 'debrief' ? state.time : state.shotMode ? 1.8 : ts / 1000);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function stepPlay(dt, controls, audio, ribbon) {
  state.time += dt;
  updateStealthDetection(state, controls, dt, audio, ribbon, handleWingClear);
  if (state.mode !== 'play') return;
  updateCuratorPatrols(state, dt, audio, triggerCurfewBreach, ribbon);
  updateEffects(state, dt, audio);
  if (state.lockdown) {
    state.mode = 'gameover';
    setGameoverReason('3 Curfew Bells tolled — Museum lockdown sealed every exit.');
    setOverlay('gameover');
  }
}

function loadMuseumWing(idx, resetRun = false) {
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
  state.lastVentAt = -Infinity;
  state.relicItems = (state.wing.relics || []).map((r) => ({ x: r.x, y: r.y, taken: false }));
  state.relicsTaken = 0; state.relicsTotal = state.relicItems.length + 1;
  state.lights = state.wing.lights.map((l) => ({ x: l.x, y: l.y, r: l.r, lit: true }));
  state.coinsInFlight = []; state.lastCoinArc = null; state.ripples = []; state.guardSteps = [];
  state.veilsActive = []; state.particles = []; state.trail = [{ x: state.wing.spawn.x, y: state.wing.spawn.y }];
  state.runPins = [{ ...state.wing.spawn, label: 'ENTRY' }];
  state.debriefTrail = null; state.lastGlimpse = null; state.bellOrigin = null; state.bellLinks = [];
  state.ribbonTimer = 0;
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

function triggerCurfewBreach(guard) {
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
  state.debriefTrail = { points: state.trail, pins: state.runPins };
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
    g1.stepTimer = g2.stepTimer = 0.39;
    ringFootsteps([g1, g2], 0.62, 0.62, 0.23);
    evaluateStealthSurface(state, 0); recomputeAllCones(); setOverlay('play'); hideRibbonBanner(); updateCuratorTelemetry(state);
    return;
  }

  if (shot === 'breach') {
    loadMuseumWing(2, true);
    state.mode = 'play'; state.time = 72.55; state.score = 2000; // 1200 Opal + 2x350 relics + 1x100 lamp
    state.opalTaken = true; state.relicItems[0].taken = true; state.relicItems[1].taken = true; state.relicsTaken = 3;
    state.coins = 2; state.coinsUsed = 2; state.veils = 2; state.dousedCount = 1; state.lights[3].lit = false;
    state.alerts = 1; state.wingAlerts = 1; state.bellCount = 1;
    const veil = { x: 554, y: 324, r: 67.5, maxR: 68, timer: 4.9, duration: 6.8, alpha: 0.9 };
    state.veilsActive = [veil];
    state.lastGlimpse = { x: veil.x, y: veil.y, angle: 0 };
    Object.assign(state.player, { x: 606, y: 350, angle: -0.08, crouched: false, noise: 28 });
    const [g0, g1, g2, g3] = state.guards;
    const hunt = (g, x, y, set) => Object.assign(g, { x, y, angle: Math.atan2(veil.y - y, veil.x - x), target: { x: veil.x, y: veil.y }, crumbs: [{ x, y }] }, set);
    hunt(g0, 412, 322, { state: 'BREACH', suspicion: 1, peakSuspicion: 1, stateTimer: 2.3, callout: 'CURFEW BELL!' });
    hunt(g1, 522, 150, { state: 'BREACH', suspicion: 1, peakSuspicion: 1, stateTimer: 2.6, callout: 'CURFEW BELL!' });
    hunt(g2, 526, 488, { state: 'SWEEPING', suspicion: 0.6, peakSuspicion: 1, stateTimer: 2.4 });
    Object.assign(g3, { x: g3.waypoints[0].x, y: g3.waypoints[0].y, angle: Math.PI / 2, wpIndex: 1, pauseLeft: 1.3, stepTimer: 0.57 });
    ringFootsteps([g3], 0.62, 0.75);
    evaluateStealthSurface(state, 0); updateBrassEyeCameras(state, 0, null, null); recomputeAllCones(); setOverlay('play');
    state.detectionState = 'BREACH'; updateCuratorTelemetry(state);
    return;
  }

  if (shot === 'sweeping') {
    loadMuseumWing(3, true);
    state.mode = 'play'; state.time = 68.6; state.score = 1650; // 1200 Opal + 1x350 relic + 1x100 lamp
    state.opalTaken = true; state.relicItems[1].taken = true; state.relicsTaken = 2;
    state.coins = 4; state.coinsUsed = 1; state.dousedCount = 1; state.lights[1].lit = false;
    Object.assign(state.player, { x: 902, y: 446, angle: -Math.PI / 2 });
    const [inspectorN, inspectorS, docent] = state.guards;
    Object.assign(inspectorN, { x: 457.6, y: inspectorN.waypoints[1].y, angle: 0, wpIndex: 1 });
    Object.assign(inspectorS, { x: 560, y: 511 });
    Object.assign(docent, { x: 712, y: 250 });
    // Trip the live wire, crouch to the east grate, then emerge in the doused northwest alcove.
    playRecording([['',1], ['S',20], ['V'], ['WD',3], ['D',15], ['',11]]);
    setOverlay('play'); updateCuratorTelemetry(state);
    return;
  }

  if (shot === 'debrief') {
    loadMuseumWing(0, true);
    state.mode = 'play';
    playRecording([
      ['',280], ['Q',280,602], ['S',20], ['D',77], ['W',41], ['R'], ['W',115], ['E'],
      ['W',41], ['A',63], ['W',27], ['',130], ['D',152], ['S',111], ['E'], ['D',82],
      ['W',85], ['D',50], ['',401], ['R'], ['Q',685,160], ['D',28],
    ]);
  }
}

function ringFootsteps(walkers, ...ages) {
  for (const dt of ages) {
    for (const g of walkers) emitGuardFootstepEcho(state, g, state.player, null);
    fadeFootstepRings(state, dt);
  }
}

// Crouched keyboard recording in 32 ms frames. Q records the cursor, not a coin landing site.
function playRecording(tape) {
  const controls = { keys: new Set(['ShiftLeft']) };
  for (const [key, framesOrX, y] of tape) {
    if (state.mode !== 'play') break;
    if (useGadget(`Key${key}`, null, null, { active: true, x: framesOrX, y })) continue;
    for (const k of key) controls.keys.add(`Key${k}`);
    for (let i = 0; i < framesOrX && state.mode === 'play'; i++) stepPlay(0.032, controls, null, null);
    for (const k of key) controls.keys.delete(`Key${k}`);
  }
}

function useGadget(code, audio, ribbon, aim = state.aim) {
  if (code === 'KeyR') douseNearbySconce(state, audio, ribbon);
  else if (code === 'KeyV') useBrassFloorVent(state, audio, ribbon);
  else if (code === 'KeyE') deployVelvetVeilSmoke(state, audio, ribbon);
  else if (code === 'KeyQ' || code === 'Space') {
    const p = state.player;
    throwBrassCoinLure(state, aim.active ? aim.x : p.x + Math.cos(p.angle) * 165,
      aim.active ? aim.y : p.y + Math.sin(p.angle) * 165, audio, ribbon);
  } else return false;
  return true;
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
  else if (useGadget(e.code, sound, triggerRibbon)) updateCuratorTelemetry(state);
  else if (e.code === 'KeyF') {
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
