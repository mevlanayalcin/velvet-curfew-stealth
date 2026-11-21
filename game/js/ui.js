// Velvet Curfew v2 — Right HUD Panel, Top Strip, Title, Perk Draft & Split Victory/Campaign UI

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
    b.innerHTML = `<strong>WING ${w.num}</strong><span>${w.title.replace(/^THE\s+/, '').split(' ')[0]}</span>`;
    b.onclick = () => onSelect(idx);
    host.appendChild(b);
  });
}

const BANNER_META = {
  HIDDEN: { cls: 'hidden-st', text: 'HIDDEN', sub: 'Unseen in shadow. Slip past lanterns.' },
  SUSPICIOUS: { cls: 'suspicious', text: 'SUSPICIOUS ?', sub: 'Something caught an eye. Freeze.' },
  ALARM: { cls: 'alarm', text: 'ALARM !', sub: 'You are seen! Break line of sight' },
  SEARCHING: { cls: 'searching', text: 'SEARCHING', sub: 'They are hunting your last spot' },
};

export function syncHud(state) {
  const w = state.wing;
  const p = state.player;

  $('hud-wing-num').textContent = String(w.num);
  $('hud-wing-name').textContent = w.title;
  $('hud-objective').textContent = state.ledgerStolen
    ? `✓ ${w.ledger.label} stolen → OBJECTIVE: Reach the EXIT unseen`
    : `OBJECTIVE: ${w.objective}`;
  $('hud-timer').textContent = formatTime(state.time);
  $('hud-score').textContent = state.score.toLocaleString('en-US');

  // Giant Detection Banner
  const meta = BANNER_META[state.detectionState] || BANNER_META.HIDDEN;
  const banner = $('hud-state-banner');
  banner.textContent = meta.text;
  banner.className = `state-banner ${meta.cls}`;
  $('hud-state-sub').textContent = meta.sub;

  // Alarm 3-pip Escalation
  const pips = $('hud-alarm-pips').children;
  for (let i = 0; i < 3; i++) {
    pips[i].className = `apip${i < state.alarmLevel ? (state.alarmLevel >= 2 || state.detectionState === 'ALARM' ? ' on-red' : ' on-warn') : ''}`;
  }
  const aw = $('hud-alarm-word');
  aw.textContent = state.alarmLevel === 0 ? 'QUIET' : state.alarmLevel === 1 ? 'WARY' : state.alarmLevel === 2 ? 'HIGH' : 'LOCKDOWN';
  aw.className = `alarm-word${state.alarmLevel >= 2 ? ' lock' : state.alarmLevel === 1 ? ' wary' : ''}`;

  // Visibility Bar
  const vw = $('hud-vis-word');
  const vf = $('hud-vis-fill');
  if (p.inLight) {
    vw.textContent = 'IN THE LIGHT';
    vw.className = 'bar-tag amber';
    vf.className = 'bar-fill vis-light';
    vf.style.width = `${Math.round(Math.max(62, p.visibility * 100))}%`;
  } else {
    vw.textContent = p.inSmoke ? 'IN SMOKE' : 'IN SHADOW';
    vw.className = 'bar-tag emerald';
    vf.className = 'bar-fill vis-shadow';
    vf.style.width = `${Math.round(Math.max(8, p.visibility * 100))}%`;
  }

  // Noise Bar
  const nw = $('hud-noise-word');
  const nf = $('hud-noise-fill');
  const loud = p.noise >= 50 || state.detectionState === 'ALARM';
  nw.textContent = loud ? 'LOUD' : p.noise >= 24 ? 'AUDIBLE' : 'SILENT';
  nw.className = `bar-tag ${loud ? 'crimson' : 'emerald'}`;
  nf.className = `bar-fill ${loud ? 'noise-loud' : 'noise-low'}`;
  nf.style.width = `${Math.min(100, Math.max(8, Math.round(loud ? Math.max(85, p.noise) : p.noise)))}%`;

  // Telemetry Counters
  $('hud-loot').textContent = `${state.lootTaken}/${state.lootTotal}`;
  renderDots($('hud-coins'), state.coins, state.maxCoins);
  renderDots($('hud-smokes'), state.smokes, state.maxSmokes);

  const sp = $('hud-spotted');
  sp.textContent = String(state.wingAlerts);
  sp.className = `cnt-v mono ${state.wingAlerts === 0 ? 'emerald' : 'crimson'}`;
  $('hud-recoveries').textContent = String(state.recoveries);

  const ex = $('hud-exit-status');
  ex.textContent = state.ledgerStolen ? 'OPEN' : 'LOCKED';
  ex.className = `cnt-v mono ${state.ledgerStolen ? 'emerald' : 'amber'}`;
}

function renderDots(el, cur, max) {
  el.innerHTML = '';
  for (let i = 0; i < Math.min(5, max); i++) {
    const d = document.createElement('span');
    d.className = `dot${i >= cur ? ' used' : ''}`;
    el.appendChild(d);
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

export function renderVictoryOverlay(state, onSelectWing) {
  const w = state.wing;
  const ghost = state.wingAlerts === 0;
  $('vic-wing-kicker').textContent = `WING ${w.num} · ${w.title}`;
  $('vic-rank-word').textContent = ghost ? 'VELVET GHOST' : 'SHADOW RUNNER';
  $('vic-rank-copy').textContent = ghost
    ? 'Never spotted. The Curfew Watch never knew you entered.'
    : 'Extracted cleanly after breaking guard pursuit.';
  $('vic-stars').textContent = ghost ? '★ ★ ★' : '★ ★ ☆';
  $('vic-time').innerHTML = `${formatTime(state.time)} <em class="par">(par ${formatTime(w.par)})</em>`;
  $('vic-spotted').textContent = String(state.wingAlerts);
  $('vic-spotted').className = `mono ${ghost ? 'emerald' : 'crimson'}`;
  $('vic-recoveries').textContent = String(state.recoveries);
  $('vic-loot').textContent = `${state.lootTaken} / ${state.lootTotal}`;

  // Right column: 5-Wing Campaign Selector with GHOST / SHADOW grades
  const list = $('vic-campaign-list');
  list.innerHTML = '';
  WINGS.forEach((wg, idx) => {
    const rec = state.campaign[idx];
    const row = document.createElement('div');
    const isCur = idx === state.wingIndex;
    const locked = !rec && idx > state.wingIndex + 1;
    row.className = `camp-row${isCur ? ' active' : ''}${locked ? ' locked' : ''}`;
    const meta = rec ? `Best ${formatTime(rec.time)}` : idx === state.wingIndex + 1 ? 'Ready to infiltrate' : 'Escape previous wing to unlock';
    const gradeHtml = rec
      ? `<div class="camp-grade"><span class="camp-stars">${rec.stars}</span><span class="camp-rank${rec.rank === 'SHADOW' ? ' shadow' : ''}">${rec.rank}</span></div>`
      : '';
    const titleCase = wg.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    row.innerHTML = `<span class="camp-num">${wg.num}</span><div class="camp-info"><div class="camp-name">${titleCase}</div><div class="camp-meta">${meta}</div></div>${gradeHtml}`;
    if (!locked) row.onclick = () => onSelectWing(idx);
    list.appendChild(row);
  });

  const perksHost = $('vic-perks');
  const shown = state.perks.length ? state.perks : [{ name: 'Felt Soles' }, { name: 'Brass Resonator' }, { name: 'Nightshade Veil' }];
  perksHost.innerHTML = shown.map((pk) => `<span class="ppill">✦ ${pk.name}</span>`).join('');
}
