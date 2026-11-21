// Velvet Curfew — Art-Deco HUD, Title, Between-Wing Perk Draft & Ghost Rank S Debrief

import { GUARD_TYPES, WINGS } from './levels.js';
import { computeGhostGrade } from './detection.js';

const $ = (id) => document.getElementById(id);

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function renderWingPicker(selectedIndex, onSelect) {
  const host = $('title-wing-list');
  host.innerHTML = '';
  WINGS.forEach((w, idx) => {
    const btn = document.createElement('button');
    btn.className = `wing-pill${idx === selectedIndex ? ' selected' : ''}`;
    btn.innerHTML = `<strong>WING ${w.numeral}</strong><span>${w.shortName}</span>`;
    btn.onclick = () => onSelect(idx);
    host.appendChild(btn);
  });
}

export function syncHud(state) {
  const w = state.wing;
  const p = state.player;

  $('hud-wing-name').textContent = w.name;
  $('hud-wing-sub').textContent = `WING ${w.id + 1} OF ${WINGS.length} · CURFEW`;
  $('hud-timer').textContent = formatTime(state.time);
  $('hud-score').textContent = state.score.toLocaleString('en-US');

  // Integrity pips
  const intEl = $('hud-integrity');
  intEl.innerHTML = '';
  for (let i = 0; i < state.maxIntegrity; i++) {
    const d = document.createElement('span');
    d.className = `int-pip${i >= state.integrity ? ' lost' : ''}`;
    intEl.appendChild(d);
  }

  // Ghost Streak tag
  const gTag = $('hud-ghost-badge');
  if (state.alerts === 0) {
    gTag.textContent = 'GHOST STREAK · UNSEEN';
    gTag.className = 'ghost-tag';
  } else {
    gTag.textContent = `ALERTS TRIGGERED: ${state.alerts}`;
    gTag.className = 'ghost-tag broken';
  }

  // Wing Objectives checklist
  const objLedger = $('obj-ledger');
  objLedger.className = `obj-item ${state.ledgerStolen ? 'done' : 'active'}`;
  objLedger.querySelector('.obj-check').textContent = state.ledgerStolen ? '✓' : '○';

  const objExit = $('obj-exit');
  const extracted = state.mode === 'victory';
  objExit.className = `obj-item ${extracted ? 'done' : state.ledgerStolen ? 'active' : ''}`;
  objExit.querySelector('.obj-check').textContent = extracted ? '✓' : state.ledgerStolen ? '▸' : '○';

  const objRelic = $('obj-relic');
  objRelic.className = `obj-item ${state.relicStolen ? 'done' : 'bonus'}`;
  objRelic.querySelector('.obj-check').textContent = state.relicStolen ? '✓' : '◇';

  // Active Perks list
  const perkEl = $('hud-perks');
  const shown = state.perks.length
    ? state.perks.slice(-3)
    : [{ name: 'Velvet Steps', desc: 'Hold SHIFT to crouch quietly in shadow pockets.' }];
  perkEl.innerHTML = shown
    .map((pk) => `<div class="perk-chip"><span class="perk-name">${pk.name}</span><span class="perk-desc">${pk.desc}</span></div>`)
    .join('');

  // Light / Shadow Status Badge
  const lb = $('hud-light-badge');
  if (p.inSmoke) {
    lb.textContent = 'SMOKED';
    lb.className = 'light-badge smoked';
  } else if (p.inShadow) {
    lb.textContent = 'SHADOWED';
    lb.className = 'light-badge shadowed';
  } else {
    lb.textContent = p.inLight ? 'EXPOSED' : 'DIM';
    lb.className = `light-badge ${p.inLight ? 'exposed' : 'shadowed'}`;
  }

  // Acoustic Noise Bar
  const db = Math.round(p.noise);
  $('hud-noise-val').textContent = `${db} dB`;
  $('hud-noise-bar').style.width = `${Math.min(100, Math.max(6, db))}%`;

  // Alert / Recovery Bar
  const suspPct = Math.round((state.maxSuspicion || 0) * 100);
  const aVal = $('hud-alert-val');
  const aBar = $('hud-alert-bar');
  if (state.anyAlert) {
    aVal.textContent = 'FULL ALERT!';
    aVal.className = 'stat-v mono crimson';
    aBar.className = 'meter-fill alert-fill';
    aBar.style.width = '100%';
  } else if (suspPct >= 15) {
    aVal.textContent = `SUSPICION ${suspPct}%`;
    aVal.className = 'stat-v mono amber';
    aBar.className = 'meter-fill alert-fill';
    aBar.style.width = `${suspPct}%`;
  } else {
    aVal.textContent = 'UNSEEN · CALM';
    aVal.className = 'stat-v mono emerald';
    aBar.className = 'meter-fill alert-fill calm';
    aBar.style.width = '14%';
  }

  // Gadgets Pips
  renderPips($('hud-coins'), state.coins, state.maxCoins);
  renderPips($('hud-smokes'), state.smokes, state.maxSmokes);

  // Guard Intel Summary (shows the 3 archetypes + live state badge)
  const gHost = $('hud-guards');
  const byType = ['warden', 'hound', 'captain'];
  gHost.innerHTML = byType
    .map((tid) => {
      const spec = GUARD_TYPES[tid];
      const active = state.guards.filter((g) => g.type === tid);
      let badge = active.length ? `${active.length}×` : '—';
      let cls = '';
      if (active.some((g) => g.state === 'ALERT')) { badge = '!'; cls = 'alert'; }
      else if (active.some((g) => g.state === 'SUSPICIOUS' || g.state === 'SEARCH' || g.suspicion > 0.25)) { badge = '?'; cls = 'warn'; }
      return `<div class="guard-row">
        <span class="guard-dot ${tid}"></span>
        <div class="guard-info">
          <div class="guard-name">${spec.name}</div>
          <div class="guard-trait">${spec.trait}</div>
        </div>
        <span class="guard-state ${cls}">${badge}</span>
      </div>`;
    })
    .join('');

  // Ghost Streak Stats
  const grade = computeGhostGrade(state.alerts, state.recoveries, state.relicStolen ? 1 : 0);
  const alEl = $('hud-alerts-count');
  alEl.textContent = String(state.alerts);
  alEl.className = `streak-num mono ${state.alerts === 0 ? 'emerald' : 'crimson'}`;
  $('hud-recoveries').textContent = String(state.recoveries);
  $('hud-mult').textContent = `×${grade.mult.toFixed(1)}`;
}

function renderPips(el, current, max) {
  el.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const sp = document.createElement('span');
    sp.className = `pip${i >= current ? ' used' : ''}`;
    el.appendChild(sp);
  }
}

export function setOverlay(mode) {
  $('overlay-title').classList.toggle('hidden', mode !== 'title');
  $('overlay-tactics').classList.toggle('hidden', mode !== 'tactics');
  $('overlay-victory').classList.toggle('hidden', mode !== 'victory');
  $('overlay-pause').classList.toggle('hidden', mode !== 'paused');
  $('overlay-gameover').classList.toggle('hidden', mode !== 'gameover');
}

export function renderTacticsOverlay(state, onPick) {
  const prevWing = WINGS[Math.max(0, state.wingIndex - 1)];
  const nextWing = state.wing;
  $('tactics-kicker').textContent = `WING ${prevWing.numeral} CLEARED · GHOST BONUS +${state.lastWingBonus.toLocaleString('en-US')}`;
  $('tactics-next-chip').innerHTML = `<span class="chip-k">NEXT WING (${nextWing.guards.length} GUARDS)</span><span class="chip-v">${nextWing.numeral} · ${nextWing.shortName.toUpperCase()}</span>`;
  $('tactics-intel').innerHTML = `<span class="intel-badge">PATROL INTEL</span><span class="intel-copy">${nextWing.intel}</span>`;

  const grid = $('tactics-cards');
  grid.innerHTML = '';
  state.draftOptions.forEach((perk, idx) => {
    const btn = document.createElement('button');
    btn.className = `draft-card${idx === 1 ? ' featured' : ''}`;
    btn.innerHTML = `
      <div class="draft-top">
        <span class="draft-tag">${perk.tag}</span>
        <span class="draft-key">[${idx + 1}]</span>
      </div>
      <div class="draft-glyph">${perk.glyph}</div>
      <div class="draft-name">${perk.name}</div>
      <div class="draft-desc">${perk.desc}</div>
      <div class="draft-cta">${idx === 1 ? '★ RECOMMENDED · EQUIP' : 'SELECT PERK →'}</div>
    `;
    btn.onclick = () => onPick(perk);
    grid.appendChild(btn);
  });
}

export function renderVictoryOverlay(state) {
  const g = computeGhostGrade(state.alerts, state.recoveries, state.relicsTotal || 0);
  $('victory-grade').textContent = g.grade;
  $('victory-rank-title').textContent = g.title;
  $('victory-total-score').textContent = `TOTAL: ${state.score.toLocaleString('en-US')} PTS`;

  const unseenPct = Math.round((state.wingScores.filter((w) => w.unseen).length / Math.max(1, state.wingScores.length)) * 100);
  $('victory-kpis').innerHTML = [
    { val: String(state.alerts), lbl: 'ALERTS', cls: state.alerts === 0 ? 'emerald' : 'crimson' },
    { val: String(state.recoveries), lbl: 'RECOVERIES', cls: 'gold' },
    { val: `${unseenPct}%`, lbl: 'UNSEEN STREAK', cls: 'cyan' },
    { val: `${state.wingScores.length}/5`, lbl: 'LEDGERS', cls: 'gold' },
  ]
    .map((k) => `<div class="kpi-box"><span class="kpi-val ${k.cls}">${k.val}</span><span class="kpi-lbl">${k.lbl}</span></div>`)
    .join('');

  const maxScore = Math.max(2500, ...state.wingScores.map((ws) => ws.score));
  $('victory-bars').innerHTML = state.wingScores
    .map((ws) => {
      const pct = Math.max(14, Math.round((ws.score / maxScore) * 100));
      return `<div class="bar-row">
        <span class="bar-label">Wing ${ws.numeral} · ${ws.shortName}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-score">${ws.score.toLocaleString('en-US')}</span>
      </div>`;
    })
    .join('');

  const feats = [];
  if (state.alerts === 0) feats.push('✦ VELVET GHOST (0 ALERTS)');
  if (state.recoveries >= 2) feats.push(`◎ SHADOW DANCER (${state.recoveries} RECOVERIES)`);
  feats.push('❖ SIREN COIN MASTER');
  feats.push('♛ FLAWLESS EXTRACTION');
  $('victory-feats').innerHTML = feats.map((f) => `<span class="feat-pill">${f}</span>`).join('');
}

export function renderGameOverOverlay(state, reason) {
  $('gameover-reason').textContent = reason;
  $('gameover-stats').innerHTML = `<span>Wing: <strong>${state.wing.numeral}</strong></span><span>Score: <strong class="gold">${state.score.toLocaleString('en-US')}</strong></span><span>Recoveries: <strong>${state.recoveries}</strong></span>`;
}
