// Velvet Curfew v2b — Original Art-Deco Dossier HUD & Split 75/25 Heist Debrief Ledger

import { WINGS } from './levels.js';

const $ = (id) => document.getElementById(id);

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function renderWingPicker(selectedIndex, onSelect) {
  const host = $('title-wing-list');
  host.innerHTML = '';
  WINGS.forEach((w, idx) => {
    const b = document.createElement('button');
    b.className = `wing-pill${idx === selectedIndex ? ' selected' : ''}`;
    b.innerHTML = `<strong>WING ${w.roman}</strong><span>${w.title.split(' ')[0]}</span>`;
    b.onclick = () => onSelect(idx);
    host.appendChild(b);
  });
}

const STATE_COPY = {
  UNSEEN: { cls: 'unseen', label: 'UNSEEN', copy: 'Hidden in midnight velvet.' },
  CURIOUS: { cls: 'curious', label: 'CURIOUS · ?', copy: 'A curator heard glass shift. Hold still.' },
  BREACH: { cls: 'breach', label: 'CURFEW BREACH · !', copy: 'Docents converging on the gallery!' },
  SWEEPING: { cls: 'sweeping', label: 'SWEEPING', copy: 'Security sweeping the last shadow.' },
};

export function syncHud(state) {
  const w = state.wing;
  const p = state.player;
  const isDebrief = state.mode === 'debrief';

  $('hud-wing-roman').textContent = w.roman;
  $('hud-wing-name').textContent = w.title;
  $('hud-gallery').textContent = `${w.roman} / V`;
  $('hud-timer').textContent = formatTime(state.time);
  $('hud-score').textContent = `+${state.score.toLocaleString('en-US')}`;
  $('hud-objective').textContent = state.sapphireTaken
    ? `✦ Star Sapphire secured — board the Brass Elevator unseen`
    : w.objective;

  // Toggle Split 75% Map / 25% Art-Deco Ledger in Debrief mode
  document.querySelector('.main-split').classList.toggle('debrief-mode', isDebrief);
  $('hud-live-view').classList.toggle('hidden', isDebrief);
  $('hud-debrief-view').classList.toggle('hidden', !isDebrief);
  $('debrief-map-tag').classList.toggle('hidden', !isDebrief);

  if (isDebrief) return;

  const meta = STATE_COPY[state.detectionState] || STATE_COPY.UNSEEN;
  const badge = $('hud-state-badge');
  badge.textContent = meta.label;
  badge.className = `state-badge ${meta.cls}`;
  $('hud-state-copy').textContent = meta.copy;

  // Curfew Bells (3 pips)
  const pips = $('hud-bells').children;
  for (let i = 0; i < 3; i++) {
    pips[i].className = `bpip${i < state.bellCount ? (state.detectionState === 'BREACH' || state.bellCount >= 2 ? ' ring' : ' warn') : ''}`;
  }
  const bw = $('hud-bell-word');
  bw.textContent = state.bellCount === 0 ? 'HUSHED' : state.bellCount === 1 ? 'TOLLED' : state.bellCount === 2 ? 'HIGH' : 'LOCKED';
  bw.className = `bell-word ${state.bellCount >= 1 ? 'crimson' : ''}`;

  // Exposure meter
  const ew = $('hud-exp-word');
  const ef = $('hud-exp-fill');
  if (p.inVeil) {
    ew.textContent = 'VELVET VEIL'; ew.className = 'mval cyan';
    ef.className = 'mfill exp-shadow'; ef.style.width = '10%';
  } else if (p.inLight) {
    ew.textContent = 'CHANDELIER'; ew.className = 'mval amber';
    ef.className = 'mfill exp-light'; ef.style.width = `${Math.round(Math.max(66, p.exposure * 100))}%`;
  } else {
    ew.textContent = p.inAlcove ? 'SHADOW ALCOVE' : 'DIM VELVET'; ew.className = 'mval emerald';
    ef.className = 'mfill exp-shadow'; ef.style.width = `${Math.round(Math.max(10, p.exposure * 100))}%`;
  }

  // Noise Ring meter
  const nw = $('hud-noise-word');
  const nf = $('hud-noise-fill');
  const loud = p.noise >= 48 || state.detectionState === 'BREACH';
  nw.textContent = loud ? 'ECHOING' : p.noise >= 24 ? 'SOFT STEP' : 'SILENT';
  nw.className = `mval ${loud ? 'crimson' : 'cyan'}`;
  nf.className = `mfill ${loud ? 'noise-loud' : 'noise-calm'}`;
  nf.style.width = `${Math.min(100, Math.max(8, Math.round(loud ? Math.max(82, p.noise) : p.noise)))}%`;

  // Gadget slots
  renderDots($('hud-coins'), state.coins, state.maxCoins);
  renderDots($('hud-veils'), state.veils, state.maxVeils);
  const st = $('hud-stance');
  st.textContent = p.crouched ? 'CROUCHED' : 'UPRIGHT';
  st.className = `stance-pill${p.crouched ? ' on' : ' up'}`;

  // Counters
  $('hud-relics').textContent = `${state.relicsTaken} / ${state.relicsTotal}`;
  const sap = $('hud-sapphire');
  sap.textContent = state.sapphireTaken ? 'STOLEN' : 'SEALED';
  sap.className = `mono ${state.sapphireTaken ? 'emerald' : 'cyan'}`;

  const al = $('hud-alerts');
  al.textContent = String(state.wingAlerts);
  al.className = `mono ${state.wingAlerts === 0 ? 'emerald' : 'crimson'}`;

  const el = $('hud-elevator');
  el.textContent = state.sapphireTaken ? 'OPEN' : 'LOCKED';
  el.className = `mono ${state.sapphireTaken ? 'emerald' : 'amber'}`;
}

function renderDots(el, cur, max) {
  el.innerHTML = '';
  for (let i = 0; i < Math.min(5, max); i++) {
    const d = document.createElement('span');
    d.className = `gdot${i >= cur ? ' used' : ''}`;
    el.appendChild(d);
  }
}

export function setOverlay(mode) {
  $('overlay-title').classList.toggle('hidden', mode !== 'title');
  $('overlay-tactics').classList.toggle('hidden', mode !== 'tactics');
  $('overlay-pause').classList.toggle('hidden', mode !== 'paused');
  $('overlay-gameover').classList.toggle('hidden', mode !== 'gameover');
}

export function renderTacticsOverlay(state, onPick) {
  const grid = $('tactics-cards');
  grid.innerHTML = '';
  state.draftOptions.forEach((pk, idx) => {
    const b = document.createElement('button');
    b.className = `draft-card${idx === 1 ? ' featured' : ''}`;
    b.innerHTML = `<span class="draft-tag">${pk.tag} [${idx + 1}]</span><div class="draft-name">${pk.name}</div><div class="draft-desc">${pk.desc}</div>`;
    b.onclick = () => onPick(pk);
    grid.appendChild(b);
  });
}

export function renderDebriefLedger(state, onSelectWing) {
  const w = state.wing;
  const ghost = state.wingAlerts === 0;
  const grade = ghost ? 'S' : state.wingAlerts === 1 ? 'A' : 'B';
  $('dmt-wing').textContent = `WING ${w.roman} · ${w.title} — GOLDEN INFILTRATION TRAIL`;
  $('deb-grade').textContent = grade;
  $('deb-rating').textContent = `GHOST RATING: ${grade}`;
  $('deb-subtitle').textContent = ghost ? `Unseen Phantom · ${w.title}` : `Velvet Escapee · ${w.title}`;
  $('deb-time').textContent = formatTime(state.time);
  $('deb-alerts').textContent = String(state.wingAlerts);
  $('deb-alerts').className = `mono ${ghost ? 'emerald' : 'crimson'}`;
  $('deb-coins').textContent = String(state.coinsUsed);
  $('deb-relics').textContent = `${state.relicsTaken} / ${state.relicsTotal}`;
  $('deb-bonus').textContent = `+${state.ghostBonus.toLocaleString('en-US')}`;

  const list = $('deb-wing-list');
  list.innerHTML = '';
  WINGS.forEach((wg, idx) => {
    const rec = state.campaign[idx];
    const row = document.createElement('div');
    const isCur = idx === state.wingIndex;
    row.className = `dw-row${isCur ? ' active' : ''}`;
    const name = wg.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const tag = rec ? `RANK ${rec.grade}` : idx === state.wingIndex + 1 ? 'NEXT →' : 'LOCKED';
    const cls = rec ? '' : idx === state.wingIndex + 1 ? 'next' : 'lock';
    row.innerHTML = `<span class="dw-name">${wg.roman}. ${name}</span><span class="dw-tag ${cls}">${tag}</span>`;
    if (rec || idx <= state.wingIndex + 1) row.onclick = () => onSelectWing(idx);
    list.appendChild(row);
  });
}
