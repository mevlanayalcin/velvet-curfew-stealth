// Velvet Curfew v3 — Live Objectives, 4 Stealth Gadgets, Per-Curator AI Telemetry & Debrief Ledger

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

const ROMANS = ['I', 'II', 'III', 'IV', 'V'];

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

  document.querySelector('.main-split').classList.toggle('debrief-mode', isDebrief);
  $('hud-live-view').classList.toggle('hidden', isDebrief);
  $('hud-debrief-view').classList.toggle('hidden', !isDebrief);
  $('debrief-map-tag').classList.toggle('hidden', !isDebrief);

  if (isDebrief) return;

  // Detection State Banner
  const meta = STATE_COPY[state.detectionState] || STATE_COPY.UNSEEN;
  const badge = $('hud-state-badge');
  badge.textContent = meta.label;
  badge.className = `state-badge ${meta.cls}`;
  $('hud-state-copy').textContent = meta.copy;

  // Curfew Bells
  const pips = $('hud-bells').children;
  for (let i = 0; i < 3; i++) {
    pips[i].className = `bpip${i < state.bellCount ? (state.detectionState === 'BREACH' || state.bellCount >= 2 ? ' ring' : ' warn') : ''}`;
  }
  const bw = $('hud-bell-word');
  bw.textContent = state.bellCount === 0 ? 'HUSHED' : state.bellCount === 1 ? 'TOLLED' : state.bellCount === 2 ? 'HIGH' : 'LOCKED';
  bw.className = `bell-word ${state.bellCount >= 1 ? 'crimson' : ''}`;

  // Exposure & Noise Bars
  const ew = $('hud-exp-word'), ef = $('hud-exp-fill');
  if (p.inVeil) {
    ew.textContent = 'VELVET VEIL'; ew.className = 'mval cyan';
    ef.className = 'mfill exp-shadow'; ef.style.width = '10%';
  } else if (p.inDoused) {
    ew.textContent = 'DEEP SHADOW'; ew.className = 'mval cyan';
    ef.className = 'mfill exp-shadow'; ef.style.width = '10%';
  } else if (p.inLight) {
    ew.textContent = 'CHANDELIER'; ew.className = 'mval amber';
    ef.className = 'mfill exp-light'; ef.style.width = `${Math.round(Math.max(66, p.exposure * 100))}%`;
  } else {
    ew.textContent = p.inAlcove ? 'SHADOW ALCOVE' : 'DEEP SHADOW'; ew.className = 'mval emerald';
    ef.className = 'mfill exp-shadow'; ef.style.width = `${Math.round(Math.max(12, p.exposure * 100))}%`;
  }

  const nw = $('hud-noise-word'), nf = $('hud-noise-fill');
  const loud = p.noise >= 48 || state.detectionState === 'BREACH';
  nw.textContent = loud ? 'ECHOING' : p.noise >= 24 ? 'SOFT STEP' : 'SILENT';
  nw.className = `mval ${loud ? 'crimson' : 'cyan'}`;
  nf.className = `mfill ${loud ? 'noise-loud' : 'noise-calm'}`;
  nf.style.width = `${Math.min(100, Math.max(8, Math.round(loud ? Math.max(82, p.noise) : p.noise)))}%`;

  // Live Objectives Checklist
  const relicsBonusDone = state.relicItems.filter((r) => r.taken).length;
  const objR = $('obj-relics');
  $('obj-relics-txt').textContent = `Loot relics (${state.relicsTaken}/${state.relicsTotal})`;
  const relicsComplete = relicsBonusDone >= state.relicItems.length && state.relicItems.length > 0;
  objR.className = `oc-row${relicsComplete || state.relicsTaken >= 2 ? ' done' : ''}`;
  objR.querySelector('.oc-box').textContent = relicsComplete || state.relicsTaken >= 2 ? '✓' : '○';

  const objS = $('obj-sapphire');
  objS.className = `oc-row ${state.sapphireTaken ? 'done' : 'active'}`;
  objS.querySelector('.oc-box').textContent = state.sapphireTaken ? '✓' : '▸';

  const objE = $('obj-elevator');
  objE.className = `oc-row ${state.sapphireTaken ? 'active' : ''}`;
  objE.querySelector('.oc-box').textContent = state.sapphireTaken ? '▸' : '○';

  // 4 Gadgets
  renderDots($('hud-coins'), state.coins, state.maxCoins);
  renderDots($('hud-veils'), state.veils, state.maxVeils);

  const dEl = $('hud-douse');
  if (p.lampInRange) {
    dEl.textContent = 'IN RANGE';
    dEl.className = 'stance-pill ready';
  } else {
    dEl.textContent = state.dousedCount > 0 ? `${state.dousedCount} DOUSED` : 'READY';
    dEl.className = 'stance-pill on';
  }

  const st = $('hud-stance');
  st.textContent = p.crouched ? 'CROUCHED' : 'UPRIGHT';
  st.className = `stance-pill${p.crouched ? ' on' : ' up'}`;

  // CURATORS · LIVE Per-Guard AI Telemetry & Suspicion Bars
  const host = $('hud-curators-live');
  const cards = [];
  state.guards.slice(0, 4).forEach((g, idx) => {
    const role = g.type === 'inspector' ? 'INSPECTOR' : g.type === 'docent' ? 'DOCENT' : 'CURATOR';
    const stKey = g.state === 'BREACH' ? 'breach' : g.state === 'SWEEPING' ? 'sweeping' : g.state === 'CURIOUS' ? 'curious' : 'patrol';
    const stLabel = g.state === 'BREACH' ? 'BREACH !' : g.state === 'SWEEPING' ? 'SWEEPING' : g.state === 'CURIOUS' ? 'CURIOUS ?' : 'PATROL';
    const pct = g.state === 'BREACH' ? 100 : g.state === 'SWEEPING' ? Math.max(58, Math.round(g.suspicion * 100)) : g.state === 'CURIOUS' ? Math.max(52, Math.round(g.suspicion * 100)) : 12;
    cards.push(`<div class="cur-card ${stKey}">
      <div class="cur-top"><span class="cur-name">${role} ${ROMANS[idx] || idx + 1}</span><span class="cur-st ${stKey}">${stLabel}</span></div>
      <div class="cur-bar"><div class="cur-fill ${stKey}" style="width:${pct}%"></div></div>
    </div>`);
  });
  if (state.cameras.length > 0 && cards.length < 4) {
    const camAlert = state.cameras.some((c) => c.alerting);
    cards.push(`<div class="cur-card${camAlert ? ' breach' : ''}">
      <div class="cur-top"><span class="cur-name">BRASS-EYE DOME</span><span class="cur-st ${camAlert ? 'breach' : 'eye'}">${camAlert ? 'LOCKED !' : 'SWEEPING'}</span></div>
      <div class="cur-bar"><div class="cur-fill ${camAlert ? 'breach' : 'eye'}" style="width:${camAlert ? 100 : 48}%"></div></div>
    </div>`);
  }
  host.innerHTML = cards.join('');
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
  $('deb-doused').textContent = String(state.dousedCount);
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
