// Velvet Curfew v4 — Contact-Sheet-Legible HUD, 4 Gadgets (Coin/Veil/Douse/Vent) & Live Curators

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
  UNSEEN: { cls: 'unseen', label: 'UNSEEN', copy: 'Safe in deep shadow.' },
  CURIOUS: { cls: 'curious', label: 'CURIOUS · ?', copy: 'Curator heard glass shift.' },
  BREACH: { cls: 'breach', label: 'BREACH · !', copy: 'Docents converging now!' },
  SWEEPING: { cls: 'sweeping', label: 'SWEEPING', copy: 'Hunting your last shadow.' },
};

const ROMANS = ['I', 'II', 'III', 'IV', 'V'];

export function syncHud(state) {
  const w = state.wing;
  const p = state.player;
  const isDebrief = state.mode === 'debrief';

  $('hud-wing-roman').textContent = w.roman;
  $('hud-wing-name').textContent = w.title;
  $('hud-gallery').textContent = `${w.roman}/V`;
  $('hud-timer').textContent = formatTime(state.time);
  $('hud-score').textContent = state.score.toLocaleString('en-US');
  $('hud-objective').textContent = state.sapphireTaken
    ? `✦ Star Sapphire taken — board the Brass Elevator unseen`
    : w.objective;

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

  const pips = $('hud-bells').children;
  for (let i = 0; i < 3; i++) {
    pips[i].className = `bpip${i < state.bellCount ? (state.detectionState === 'BREACH' || state.bellCount >= 2 ? ' ring' : ' warn') : ''}`;
  }
  const bw = $('hud-bell-word');
  bw.textContent = state.bellCount === 0 ? 'HUSHED' : state.bellCount === 1 ? 'TOLLED' : state.bellCount === 2 ? 'HIGH' : 'LOCKED';
  bw.className = `bell-word ${state.bellCount >= 1 ? 'crimson' : ''}`;

  const ew = $('hud-exp-word'), ef = $('hud-exp-fill');
  if (p.inVeil) {
    ew.textContent = 'VELVET VEIL'; ew.className = 'mval violet';
    ef.className = 'mfill exp-shadow'; ef.style.width = '10%';
  } else if (p.inDoused) {
    ew.textContent = 'DEEP SHADOW'; ew.className = 'mval emerald';
    ef.className = 'mfill exp-shadow'; ef.style.width = '10%';
  } else if (p.inLight) {
    ew.textContent = 'LIT POOL'; ew.className = 'mval amber';
    ef.className = 'mfill exp-light'; ef.style.width = `${Math.round(Math.max(72, p.exposure * 100))}%`;
  } else {
    ew.textContent = 'DEEP SHADOW'; ew.className = 'mval emerald';
    ef.className = 'mfill exp-shadow'; ef.style.width = `${Math.round(Math.max(12, p.exposure * 100))}%`;
  }

  const nw = $('hud-noise-word'), nf = $('hud-noise-fill');
  const loud = p.noise >= 48 || state.detectionState === 'BREACH';
  nw.textContent = loud ? 'ECHOING' : p.noise >= 24 ? 'SOFT' : 'SILENT';
  nw.className = `mval ${loud ? 'crimson' : 'cyan'}`;
  nf.className = `mfill ${loud ? 'noise-loud' : 'noise-calm'}`;
  nf.style.width = `${Math.min(100, Math.max(10, Math.round(loud ? Math.max(85, p.noise) : p.noise)))}%`;

  // Compact 3-Item Objectives
  const objR = $('obj-relics');
  $('obj-relics-txt').textContent = `Relics (${state.relicsTaken}/${state.relicsTotal})`;
  objR.className = `oc-row${state.relicsTaken >= 2 ? ' done' : ''}`;
  objR.querySelector('.oc-box').textContent = state.relicsTaken >= 2 ? '✓' : '○';

  const objS = $('obj-sapphire');
  objS.className = `oc-row ${state.sapphireTaken ? 'done' : 'active'}`;
  objS.querySelector('.oc-box').textContent = state.sapphireTaken ? '✓' : '▸';

  const objE = $('obj-elevator');
  objE.className = `oc-row ${state.sapphireTaken ? 'active' : ''}`;
  objE.querySelector('.oc-box').textContent = state.sapphireTaken ? '▸' : '○';

  // Bold 2x2 Gadgets Grid
  $('hud-coins-val').textContent = `×${state.coins}`;
  $('hud-veils-val').textContent = `×${state.veils}`;
  $('hud-douse-val').textContent = p.lampInRange ? 'READY!' : `${state.dousedCount} OFF`;
  $('gbox-douse').className = `gbox${p.lampInRange ? ' hot' : ''}`;
  $('hud-vent-val').textContent = p.ventInRange ? 'ENTER!' : 'LINKED';
  $('gbox-vent').className = `gbox${p.ventInRange ? ' hot' : ''}`;

  // CURATORS · LIVE (Top 3 most relevant units w/ thick 6px readable bars!)
  const host = $('hud-curators-live');
  const sorted = [...state.guards].sort((a, b) => {
    const rank = { BREACH: 3, SWEEPING: 2, CURIOUS: 1, PATROL: 0 };
    return (rank[b.state] || 0) - (rank[a.state] || 0);
  });
  host.innerHTML = sorted.slice(0, 3).map((g, idx) => {
    const role = g.type === 'inspector' ? 'INSPECTOR' : g.type === 'docent' ? 'DOCENT' : 'CURATOR';
    const stKey = g.state === 'BREACH' ? 'breach' : g.state === 'SWEEPING' ? 'sweeping' : g.state === 'CURIOUS' ? 'curious' : 'patrol';
    const stLabel = g.state === 'BREACH' ? 'BREACH !' : g.state === 'SWEEPING' ? 'SWEEPING' : g.state === 'CURIOUS' ? 'CURIOUS ?' : 'PATROL';
    const pct = g.state === 'BREACH' ? 100 : g.state === 'SWEEPING' ? Math.max(66, Math.round(g.suspicion * 100)) : g.state === 'CURIOUS' ? Math.max(64, Math.round(g.suspicion * 100)) : 24;
    return `<div class="cur-card ${stKey}">
      <div class="cur-top"><span class="cur-name">${role} ${ROMANS[g.id] || idx + 1}</span><span class="cur-st ${stKey}">${stLabel}</span></div>
      <div class="cur-bar"><div class="cur-fill ${stKey}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
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
