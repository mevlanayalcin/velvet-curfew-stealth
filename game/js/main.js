// Velvet Curfew v2 — Main Engine Loop, Input & 4-Shot Multi-Room Stealth Showcase

import { PERKS, STAGE_H, STAGE_W, WINGS } from './levels.js';
import { buildSegments, computeVisionPolygon } from './vision.js';
import { createCameras, createGuards, createTripwires, updateSecurity } from './patrol.js';
import {
  claimLedger, computeMods, deploySmoke, evaluateStealthSurface,
  spawnSparks, throwCoin, updateEffects, updatePlayer,
} from './detection.js';
import { renderStage } from './render.js';
import { SoundEngine } from './audio.js';
import { renderTacticsOverlay, renderVictoryOverlay, renderWingPicker, setOverlay, syncHud } from './ui.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot'); // 'play' | 'alarm' | 'searching' | 'victory' | null

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
  alarmLevel: 0,
  alarmCooldown: 0,
  lockdown: false,
  alerts: 0,
  wingAlerts: 0,
  recoveries: 0,
  coins: 4,
  maxCoins: 4,
  smokes: 2,
  maxSmokes: 2,
  ledgerStolen: false,
  lootItems: [],
  lootTaken: 0,
  lootTotal: 4,
  perks: [],
  mods: computeMods([]),
  campaign: {},
  player: null,
  guards: [],
  cameras: [],
  tripwires: [],
  coinsInFlight: [],
  ripples: [],
  smokesActive: [],
  particles: [],
  lastSeen: null,
  alarmOrigin: null,
  alarmLinks: [],
  detectionState: 'HIDDEN',
  maxSuspicion: 0,
  aim: { x: 410, y: 288, active: false },
  draftOptions: [],
  ribbonTimer: 0,
};

function showRibbon(text, isDanger = false, dur = 3.0) {
  const el = document.getElementById('alert-ribbon');
  el.textContent = text;
  el.className = `alert-ribbon${isDanger ? '' : ' info'}`;
  state.ribbonTimer = dur;
}

function hideRibbon() {
  document.getElementById('alert-ribbon').classList.add('hidden');
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
  state.alarmLevel = 0;
  state.alarmCooldown = 0;
  state.lockdown = false;
  state.maxCoins = state.wing.coins + state.mods.bonusCoins;
  state.coins = state.maxCoins;
  state.maxSmokes = state.wing.smokes + state.mods.bonusSmokes;
  state.smokes = state.maxSmokes;
  state.ledgerStolen = false;
  state.lootItems = (state.wing.loot || []).map((l) => ({ x: l.x, y: l.y, taken: false }));
  state.lootTaken = 0;
  state.lootTotal = state.lootItems.length + 1;
  state.coinsInFlight = [];
  state.ripples = [];
  state.smokesActive = [];
  state.particles = [];
  state.lastSeen = null;
  state.alarmOrigin = null;
  state.alarmLinks = [];
  state.detectionState = 'HIDDEN';
  state.maxSuspicion = 0;

  state.player = {
    x: state.wing.spawn.x, y: state.wing.spawn.y, r: 10, angle: -0.5,
    crouched: false, hiding: false, inShadow: true, inLight: false,
    inLowCover: false, inSmoke: false, onCarpet: false,
    shadowLingerTimer: 0, sprintTimer: 0, noise: 6, visibility: 0.1, stepTimer: 0.1,
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
    cam.visionPoly = computeVisionPolygon(cam.x, cam.y, cam.angle, cam.fov, cam.range, state.geom, state.smokesActive);
  }
  for (const g of state.guards) {
    g.visionPoly = computeVisionPolygon(g.x, g.y, g.angle, g.spec.fov, g.spec.visionRange, state.geom, state.smokesActive);
  }
}

function handleWingClear() {
  const ghost = state.wingAlerts === 0;
  state.score += Math.round((ghost ? 1500 : 650) * state.mods.scoreMult);
  state.campaign[state.wingIndex] = {
    time: state.time,
    stars: ghost ? '★★★' : '★★☆',
    rank: ghost ? 'GHOST' : 'SHADOW',
  };
  state.mode = 'victory';
  renderVictoryOverlay(state, (idx) => { loadWing(idx, false); state.mode = 'play'; setOverlay('play'); });
  setOverlay('victory');
  syncHud(state);
}

function handlePlayerHit(guard) {
  spawnSparks(state, state.player.x, state.player.y, '#ef4444', 18);
  state.mode = 'gameover';
  document.getElementById('gameover-reason').textContent = `Apprehended by ${guard.spec.name} in ${state.wing.title}.`;
  setOverlay('gameover');
}

function openNextWingOrDraft() {
  if (state.wingIndex >= WINGS.length - 1) {
    loadWing(0, true);
    state.mode = 'play';
    setOverlay('play');
    return;
  }
  loadWing(state.wingIndex + 1, false);
  const owned = new Set(state.perks.map((p) => p.id));
  const pool = PERKS.filter((p) => !owned.has(p.id));
  state.draftOptions = pool.slice(0, 3);
  if (state.draftOptions.length) {
    state.mode = 'tactics';
    renderTacticsOverlay(state, (pk) => {
      state.perks.push(pk);
      loadWing(state.wingIndex, false);
      state.mode = 'play';
      setOverlay('play');
      showRibbon(`EQUIPPED ${pk.name.toUpperCase()} — WING ${state.wing.num}`, false);
    });
    setOverlay('tactics');
  } else {
    state.mode = 'play';
    setOverlay('play');
  }
}

// Configure exact deterministic multi-room showcase states driving the real raycast renderer
function applyShotPreset(shot) {
  if (shot === 'play') {
    // HERO COVER: Wing 3 Glass Conservatory — SUSPICIOUS ? Coin Distraction + Brass-Eye Teal Cameras + HIDDEN in Low Cover!
    loadWing(2, true);
    state.mode = 'play';
    state.time = 64;
    state.score = 4850;
    state.coins = 2;
    state.maxCoins = 3;
    state.smokes = 2;
    state.lootTaken = 1;
    state.recoveries = 2;
    state.detectionState = 'SUSPICIOUS';
    state.alarmLevel = 0;

    // Player crouched HIDDEN inside lower-left emerald planter right past the Warden's cone!
    state.player.x = 246;
    state.player.y = 466;
    state.player.angle = -0.3;
    state.player.crouched = true;
    state.player.noise = 8;

    // Brass-Eye Cameras sweeping crisp teal cones clipped cleanly by mahogany crates
    state.cameras[0].angle = 2.38;
    state.cameras[1].angle = 2.46;

    // Guard 0: Lantern Warden (?) drawn to tossed Brass Coin ("WHAT WAS THAT?") with yellow cone split by crates!
    const g0 = state.guards[0];
    g0.x = 546; g0.y = 404; g0.angle = -2.42;
    g0.state = 'SUSPICIOUS'; g0.suspicion = 0.72;
    g0.lurePos = { x: 462, y: 492 };

    // Guard 1: Calm lower-left Lantern Warden sweeping past the player's hidden planter
    const g1 = state.guards[1];
    g1.x = 136; g1.y = 502; g1.angle = -0.84;
    g1.state = 'PATROL';

    // Guard 2: Upper gallery Warden sweeping left through doorway
    const g2 = state.guards[2];
    g2.x = 420; g2.y = 112; g2.angle = 3.14;
    g2.state = 'PATROL';

    // Guard 3: East wing Bell Hound sweeping downward across glass wall
    const g3 = state.guards[3];
    g3.x = 696; g3.y = 196; g3.angle = 1.02;
    g3.state = 'PATROL';

    state.ripples = [
      { x: 462, y: 492, r: 42, maxR: 150, alpha: 0.92, kind: 'coin', label: 'WHAT WAS THAT?' },
      { x: 462, y: 492, r: 96, maxR: 150, alpha: 0.56, kind: 'coin' },
    ];
    evaluateStealthSurface(state, 0);
    recomputeAllCones();
    setOverlay('play');
    hideRibbon();
    syncHud(state);
    return;
  }

  if (shot === 'alarm') {
    // SHOT 2: Wing 4 Clockwork Foundry — LIVE ALARM ! Red State + Answering Alarm + Laser Tripwire!
    loadWing(3, true);
    state.mode = 'play';
    state.time = 38;
    state.score = 6250;
    state.coins = 3;
    state.maxCoins = 3;
    state.smokes = 2;
    state.wingAlerts = 1;
    state.alarmLevel = 1;
    state.recoveries = 1;
    state.detectionState = 'ALARM';

    // Player caught in bright casting hall light
    state.player.x = 418;
    state.player.y = 266;
    state.player.angle = 0.2;
    state.player.crouched = false;
    state.player.noise = 88;
    state.player.inLight = true;
    state.player.inShadow = false;
    state.player.visibility = 0.88;

    // Alerting Night Captain (!) with blazing crimson cone split around crates
    const g0 = state.guards[0];
    g0.x = 318; g0.y = 222; g0.angle = 0.62;
    g0.state = 'ALARM'; g0.suspicion = 1;

    // Two neighboring guards snapping to ? and answering the alarm
    const g1 = state.guards[1];
    g1.x = 288; g1.y = 112; g1.angle = 1.56;
    g1.state = 'SUSPICIOUS'; g1.suspicion = 0.72;

    const g2 = state.guards[2];
    g2.x = 642; g2.y = 320; g2.angle = -1.62;
    g2.state = 'SUSPICIOUS'; g2.suspicion = 0.72;

    const g3 = state.guards[3];
    g3.x = 196; g3.y = 506; g3.angle = 0.16;
    g3.state = 'PATROL';

    state.cameras[0].angle = 1.05;
    state.tripwires[0].active = true;
    state.alarmOrigin = { x: 418, y: 266 };
    state.alarmLinks = [
      { x1: 418, y1: 266, x2: g1.x, y2: g1.y },
      { x1: 418, y1: 266, x2: g2.x, y2: g2.y },
    ];

    recomputeAllCones();
    setOverlay('play');
    showRibbon('SPOTTED! Break line of sight or drop Smoke [Q].', true, 99);
    syncHud(state);
    return;
  }

  if (shot === 'searching') {
    // SHOT 3: Wing 2 Meridian Archive — LIVE SEARCHING / RECOVERY State over X LAST SEEN + Velvet Smoke!
    loadWing(1, true);
    state.mode = 'play';
    state.time = 52;
    state.score = 5400;
    state.coins = 3;
    state.maxCoins = 3;
    state.smokes = 1;
    state.wingAlerts = 1;
    state.alarmLevel = 1;
    state.recoveries = 2;
    state.detectionState = 'SEARCHING';

    // Player slipped south past crates & fading Velvet Smoke into HIDDEN shadow cover!
    state.player.x = 326;
    state.player.y = 266;
    state.player.angle = -1.5;
    state.player.crouched = true;
    state.player.noise = 8;

    // Fading Velvet Smoke veil helping break the Night Captain's sightline
    state.smokesActive = [
      { x: 432, y: 214, r: 46, maxR: 52, timer: 2.2, duration: 6.5, alpha: 0.74 },
    ];

    // Night Captain sweeping vivid orange cone over X LAST SEEN marker in upper velvet hall
    const g0 = state.guards[0];
    g0.x = 362; g0.y = 148; g0.angle = -1.16;
    g0.state = 'SEARCHING'; g0.suspicion = 0.65;
    state.lastSeen = { x: 362, y: 168 };

    const g1 = state.guards[1];
    g1.x = 238; g1.y = 536; g1.angle = -1.57;
    g1.state = 'PATROL';

    const g2 = state.guards[2];
    g2.x = 768; g2.y = 394; g2.angle = 2.18;
    g2.state = 'PATROL';

    state.cameras[0].angle = 1.72;
    evaluateStealthSurface(state, 0);
    recomputeAllCones();
    setOverlay('play');
    hideRibbon();
    syncHud(state);
    return;
  }

  if (shot === 'victory') {
    // SHOT 4: Split ESCAPED · VELVET GHOST ★★★ + 5-Wing Campaign over dimmed Glass Conservatory!
    loadWing(2, true);
    state.time = 94;
    state.score = 12450;
    state.ledgerStolen = true;
    state.lootTaken = 4;
    state.lootTotal = 4;
    state.wingAlerts = 0;
    state.recoveries = 3;
    state.perks = [PERKS[0], PERKS[1], PERKS[2]];
    state.campaign = {
      0: { time: 58, stars: '★★★', rank: 'GHOST' },
      1: { time: 84, stars: '★★☆', rank: 'SHADOW' },
      2: { time: 94, stars: '★★★', rank: 'GHOST' },
    };
    state.detectionState = 'HIDDEN';
    state.mode = 'victory';
    recomputeAllCones();
    renderVictoryOverlay(state, () => {});
    setOverlay('victory');
    hideRibbon();
    syncHud(state);
  }
}

// UI Bindings
function selectTitleWing(idx) {
  state.selectedStartWing = idx;
  loadWing(idx, true);
  renderWingPicker(idx, selectTitleWing);
}

document.getElementById('btn-start').onclick = () => {
  sound.unlock();
  loadWing(state.selectedStartWing, true);
  state.mode = 'play';
  setOverlay('play');
  showRibbon(`WING ${state.wing.num}: ${state.wing.title} — STAY UNSEEN`, false);
};
document.getElementById('btn-next-wing').onclick = () => { sound.unlock(); openNextWingOrDraft(); };
document.getElementById('btn-retry-vic').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-title-vic').onclick = () => { state.mode = 'title'; renderWingPicker(state.wingIndex, selectTitleWing); setOverlay('title'); };
document.getElementById('btn-resume').onclick = () => { state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-restart-pause').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-retry-go').onclick = () => { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); };
document.getElementById('btn-title-go').onclick = () => { state.mode = 'title'; renderWingPicker(state.wingIndex, selectTitleWing); setOverlay('title'); };
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
  throwCoin(state, ((e.clientX - r.left) / r.width) * STAGE_W, ((e.clientY - r.top) / r.height) * STAGE_H, sound, showRibbon);
  syncHud(state);
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  input.keys.add(e.code);

  if (e.code === 'KeyM') { sound.unlock(); document.getElementById('btn-mute').textContent = sound.toggleMute() ? 'MUTED' : 'SFX'; return; }
  if (state.mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) { document.getElementById('btn-start').click(); return; }
  if (state.mode === 'victory' && e.code === 'Enter') { openNextWingOrDraft(); return; }
  if ((state.mode === 'victory' || state.mode === 'gameover') && e.code === 'KeyR') { loadWing(state.wingIndex, false); state.mode = 'play'; setOverlay('play'); return; }
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
  else if (e.code === 'KeyR') { loadWing(state.wingIndex, false); showRibbon(`WING ${state.wing.num} RESTARTED`, false); }
  else if (e.code === 'KeyQ') { deploySmoke(state, sound, showRibbon); syncHud(state); }
  else if (e.code === 'Space') {
    const tx = state.aim.active ? state.aim.x : state.player.x + Math.cos(state.player.angle) * 130;
    const ty = state.aim.active ? state.aim.y : state.player.y + Math.sin(state.player.angle) * 130;
    throwCoin(state, tx, ty, sound, showRibbon);
    syncHud(state);
  } else if (e.code === 'KeyE') {
    const p = state.player;
    if (!state.ledgerStolen && Math.hypot(p.x - state.wing.ledger.x, p.y - state.wing.ledger.y) < 52 + state.mods.lootRangeBonus) {
      claimLedger(state, sound, showRibbon);
    } else {
      p.hiding = !p.hiding;
      showRibbon(p.hiding ? 'SHADOW CROUCH LOCKED ON' : 'STANDING STANCE', false, 1.5);
    }
    syncHud(state);
  }
});
window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });

// Initialize
if (shotParam && ['play', 'alarm', 'searching', 'victory'].includes(shotParam)) {
  applyShotPreset(shotParam);
} else {
  loadWing(0, true);
  state.mode = 'title';
  renderWingPicker(0, selectTitleWing);
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
      updateSecurity(state, dt, sound, handlePlayerHit, showRibbon);
      updateEffects(state, dt, sound);
      if (state.lockdown) {
        state.mode = 'gameover';
        document.getElementById('gameover-reason').textContent = '3 Alarms triggered — Museum Lockdown sealed the exits.';
        setOverlay('gameover');
      }
      if (state.ribbonTimer > 0) {
        state.ribbonTimer -= dt;
        if (state.ribbonTimer <= 0) hideRibbon();
      }
      syncHud(state);
    } else if (state.mode === 'title' || state.mode === 'tactics' || state.mode === 'victory') {
      state.time += dt * 0.5;
      updateSecurity(state, dt * 0.5, null, null, null);
    }
  }

  renderStage(ctx, state, state.shotMode ? 1.8 : ts / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
