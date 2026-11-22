// Velvet Curfew — Art-Deco HUD, Field Legend, Live Telemetry & Debrief Ledger

import { MUSEUM_WINGS } from './levels.js';

export { mountArtDecoHud, renderDebriefLedger };
export { updateCuratorTelemetry, renderWingPicker, renderTacticsOverlay, setOverlay, showRibbonBanner, hideRibbonBanner, setGameoverReason, setMuteLabel };

const ui = (k) => document.querySelector(`[data-ui="${k}"]`);
const wingName = (w) => w.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const STATE_COPY = {
  UNSEEN: { cls: 'unseen', label: 'UNSEEN', copy: 'Safe in deep shadow.' },
  CURIOUS: { cls: 'curious', label: 'CURIOUS · ?', copy: 'Investigating a disturbance.' },
  BREACH: { cls: 'breach', label: 'BREACH · !', copy: 'Docents converging now!' },
  SWEEPING: { cls: 'sweeping', label: 'SWEEPING', copy: 'Hunting your last shadow.' },
};
const ROMANS = ['I', 'II', 'III', 'IV', 'V'];

function mountArtDecoHud(handlers) {
  if (!document.querySelector('[data-ui="objective"]')) {
    document.getElementById('topbar').innerHTML = `
      <div class="top-left">
        <span data-ui="wing-roman" class="roman-seal">I</span>
        <span data-ui="wing-name" class="wing-title">GRAND ROTUNDA</span>
        <span class="brass-pip">◆</span>
        <span data-ui="objective" class="top-objective">Slip unseen to The Solis Opal vitrine, then board the Brass Elevator</span>
      </div>
      <div class="top-right">
        <span class="top-metric"><em class="mk">WING</em> <strong data-ui="gallery" class="mono">I/V</strong></span>
        <span class="top-metric"><em class="mk">TIME</em> <strong data-ui="timer" class="mono">00:46</strong></span>
        <span class="top-metric"><em class="mk">SCORE</em> <strong data-ui="score" class="mono gold">800</strong></span>
        <button data-ui="btn-mute" class="mute-btn" title="Mute Audio (M)">SFX</button>
      </div>`;
  }

  document.getElementById('overlays').innerHTML = `
    <div data-ui="curfew-ribbon" class="curfew-ribbon hidden"></div>
    <div data-ui="debrief-map-tag" class="debrief-map-tag hidden">
      <span class="dmt-gold">✦ INFILTRATION LOG</span>
      <span data-ui="dmt-wing">WING I · GRAND ROTUNDA — GOLDEN TRAIL</span>
    </div>
    <div data-ui="overlay-title" class="stage-overlay hidden">
      <div class="deco-modal title-modal">
        <div class="deco-rule"><span>✦ GRAND MERIDIAN MUSEUM · 1928 ✦</span></div>
        <h1 class="hero-logo">VELVET CURFEW</h1>
        <p class="hero-desc">Stick to deep midnight shadow, read curator footsteps through walls, douse brass sconces, slip through subfloor vents, and vanish with The Solis Opal.</p>
        <div class="tri-steps">
          <div class="step-box"><b>I · SHADOW</b><span>Douse sconces [R] &amp; crouch behind velvet sofas.</span></div>
          <div class="step-box"><b>II · MISDIRECT</b><span>Toss Coins [Q] or pop Velvet Veil [E] to sever sightlines.</span></div>
          <div class="step-box"><b>III · EXTRACT</b><span>Lift The Solis Opal &amp; board the Brass Elevator.</span></div>
        </div>
        <div data-ui="title-wing-list" class="wing-pills"></div>
        <div class="btn-row"><button data-ui="btn-start" class="btn-brass">ENTER GALLERY [SPACE]</button></div>
      </div>
    </div>
    <div data-ui="overlay-tactics" class="stage-overlay hidden">
      <div class="deco-modal tactics-modal">
        <div class="deco-rule"><span>GALLERY CLEARED · EQUIP STEALTH PERK</span></div>
        <h2 class="modal-h2">CHOOSE 1 OF 3 ARTIFACTS</h2>
        <div data-ui="tactics-cards" class="perk-grid"></div>
      </div>
    </div>
    <div data-ui="overlay-pause" class="stage-overlay hidden">
      <div class="deco-modal mini-modal">
        <div class="deco-rule"><span>CURFEW SUSPENDED</span></div>
        <h2 class="modal-h2">PAUSED</h2>
        <div class="btn-row">
          <button data-ui="btn-resume" class="btn-brass">RESUME [P]</button>
          <button data-ui="btn-restart-pause" class="btn-ghost">RESTART [X]</button>
        </div>
      </div>
    </div>
    <div data-ui="overlay-gameover" class="stage-overlay hidden">
      <div class="deco-modal mini-modal">
        <div class="deco-rule crimson"><span>CURFEW LOCKDOWN</span></div>
        <h2 class="modal-h2">DETAINED</h2>
        <p data-ui="gameover-reason" class="hero-desc">Museum security sealed the gallery doors.</p>
        <div class="btn-row">
          <button data-ui="btn-retry-go" class="btn-brass">RETRY WING [X]</button>
          <button data-ui="btn-title-go" class="btn-ghost">TITLE</button>
        </div>
      </div>
    </div>`;

  document.getElementById('hud').innerHTML = `
    <div data-ui="hud-live" class="hud-view">
      <div class="hud-crest"><span class="crest-line"></span><span class="crest-word">VELVET CURFEW</span><span class="crest-line"></span></div>
      <div class="hud-sec">
        <div data-ui="state-badge" class="state-badge curious">CURIOUS · ?</div>
        <div data-ui="state-copy" class="state-copy">Curator heard glass shift.</div>
        <div class="bell-row">
          <span class="hk">BELLS</span>
          <div data-ui="bells" class="bell-pips"><span class="bpip"></span><span class="bpip"></span><span class="bpip"></span></div>
          <span data-ui="bell-word" class="bell-word">HUSHED</span>
        </div>
        <div class="meter-row">
          <div class="meter-meta"><span class="hk">LIGHT</span><span data-ui="exp-word" class="mval emerald">DEEP SHADOW</span></div>
          <div class="mtrack"><div data-ui="exp-fill" class="mfill exp-shadow" style="width:14%"></div></div>
        </div>
        <div class="meter-row">
          <div class="meter-meta"><span class="hk">NOISE</span><span data-ui="noise-word" class="mval cyan">SILENT</span></div>
          <div class="mtrack"><div data-ui="noise-fill" class="mfill noise-calm" style="width:10%"></div></div>
        </div>
      </div>
      <div class="hud-sec">
        <div class="sec-h">OBJECTIVES</div>
        <ul class="obj-check-list">
          <li data-ui="obj-relics" class="oc-row"><span class="oc-box">○</span><span data-ui="obj-relics-txt">Relics (2/4)</span></li>
          <li data-ui="obj-opal" class="oc-row active"><span class="oc-box">▸</span><span>The Solis Opal</span></li>
          <li data-ui="obj-elevator" class="oc-row"><span class="oc-box">○</span><span>Brass Elevator</span></li>
        </ul>
      </div>
      <div class="hud-sec">
        <div class="sec-h">GADGETS</div>
        <div class="gadget-grid">
          <div class="gbox"><span class="gbox-k"><kbd>Q</kbd>COIN</span><strong data-ui="coins-val" class="gbox-v gold mono">×3</strong></div>
          <div class="gbox"><span class="gbox-k"><kbd>E</kbd>VEIL</span><strong data-ui="veils-val" class="gbox-v violet mono">×2</strong></div>
          <div class="gbox" data-ui="gbox-douse"><span class="gbox-k"><kbd>R</kbd>DOUSE</span><strong data-ui="douse-val" class="gbox-v cyan mono">1 OFF</strong></div>
          <div class="gbox" data-ui="gbox-vent"><span class="gbox-k"><kbd>V</kbd>VENT</span><strong data-ui="vent-val" class="gbox-v emerald mono">LINKED</strong></div>
        </div>
      </div>
      <div class="hud-sec">
        <div class="sec-h">CURATORS · LIVE</div>
        <div data-ui="curators-live" class="curator-list"></div>
      </div>
      <div class="hud-sec legend-sec">
        <div class="sec-h">LEGEND</div>
        <ul class="legend-list">
          <li><span class="li-ico li-cur"></span><span>Curator + vision cone</span></li>
          <li><span class="li-ico li-track"></span><span>Dotted patrol: 1s / 2s stops</span></li>
          <li><span class="li-ico li-sofa"></span><span>Velvet sofa: crouch to hide</span></li>
          <li><span class="li-ico li-hatch"></span><span>Hatched wedge: safe from sight</span></li>
          <li><span class="li-ico li-lamp"></span><span>Brass lamp: lit=seen / [R] douse</span></li>
          <li><span class="li-ico li-sec"></span><span>Security eye / laser tripwire</span></li>
          <li><span class="li-ico li-elev"></span><span>Elevator: unlocks with Opal</span></li>
        </ul>
      </div>
    </div>
    <div data-ui="hud-debrief" class="hud-view debrief-view hidden">
      <div class="deb-kicker">CURFEW BEATEN</div>
      <div class="deb-seal-wrap">
        <div class="deb-seal"><span data-ui="deb-grade" class="deb-letter">S</span></div>
        <div data-ui="deb-rating" class="deb-rating">GHOST RATING: S</div>
        <div data-ui="deb-subtitle" class="deb-sub">Unseen Phantom · Grand Rotunda</div>
      </div>
      <div class="deb-ledger">
        <div class="dl-row"><span>TIME</span><strong data-ui="deb-time" class="mono">01:18</strong></div>
        <div class="dl-row"><span>ALERTS</span><strong data-ui="deb-alerts" class="mono emerald">0</strong></div>
        <div class="dl-row"><span>LAMPS DOUSED</span><strong data-ui="deb-doused" class="mono cyan">2</strong></div>
        <div class="dl-row"><span>COINS USED</span><strong data-ui="deb-coins" class="mono gold">2</strong></div>
        <div class="dl-row"><span>RELICS</span><strong data-ui="deb-relics" class="mono gold">4 / 4</strong></div>
        <div class="dl-row highlight"><span>GHOST BONUS</span><strong data-ui="deb-bonus" class="mono gold">+2,500</strong></div>
      </div>
      <div class="deb-wings">
        <div class="sec-h">MUSEUM LEDGER · 5 WINGS</div>
        <div data-ui="deb-wing-list" class="dw-list"></div>
      </div>
      <div class="deb-btns">
        <button data-ui="btn-next-wing" class="btn-brass btn-full">NEXT WING ↵</button>
        <div class="deb-btn-pair">
          <button data-ui="btn-retry-deb" class="btn-ghost">REPLAY</button>
          <button data-ui="btn-title-deb" class="btn-ghost">TITLE</button>
        </div>
      </div>
    </div>`;

  if (!document.getElementById('controls').children.length) {
    document.getElementById('controls').innerHTML = `
      <span><kbd>WASD</kbd> Move</span><span class="bsep">·</span>
      <span><kbd>SHIFT</kbd> Crouch in Cover</span><span class="bsep">·</span>
      <span><kbd>Q</kbd>/<kbd>LMB</kbd> Coin Lure</span><span class="bsep">·</span>
      <span><kbd>E</kbd> Velvet Veil</span><span class="bsep">·</span>
      <span><kbd>R</kbd> Douse Lamp</span><span class="bsep">·</span>
      <span><kbd>V</kbd> Brass Vent</span><span class="bsep">·</span>
      <span><kbd>P</kbd> Pause</span><span class="bsep">·</span>
      <span><kbd>X</kbd> Restart</span>`;
  }

  ui('btn-start').onclick = handlers.onStart;
  ui('btn-next-wing').onclick = handlers.onNextWing;
  ui('btn-retry-deb').onclick = handlers.onRetry;
  ui('btn-title-deb').onclick = handlers.onTitle;
  ui('btn-resume').onclick = handlers.onResume;
  ui('btn-restart-pause').onclick = handlers.onRetry;
  ui('btn-retry-go').onclick = handlers.onRetry;
  ui('btn-title-go').onclick = handlers.onTitle;
  ui('btn-mute').onclick = handlers.onMute;
}

function updateCuratorTelemetry(state) {
  const w = state.wing, p = state.player, isDebrief = state.mode === 'debrief';
  ui('wing-roman').textContent = w.roman;
  ui('wing-name').textContent = w.title;
  ui('gallery').textContent = `${w.roman}/V`;
  ui('timer').textContent = formatTime(state.time);
  ui('score').textContent = state.score.toLocaleString('en-US');
  ui('objective').textContent = isDebrief ? `CURFEW BEATEN — Wing ${w.roman} ${wingName(w)} cleared` :
    state.opalTaken ? '✦ The Solis Opal taken — board the Brass Elevator unseen' : w.objective;

  document.querySelector('.main-split').classList.toggle('debrief-mode', isDebrief);
  ui('hud-live').classList.toggle('hidden', isDebrief);
  ui('hud-debrief').classList.toggle('hidden', !isDebrief);
  ui('debrief-map-tag').classList.toggle('hidden', !isDebrief);
  if (isDebrief) return;

  const meta = STATE_COPY[state.detectionState] || STATE_COPY.UNSEEN;
  const badge = ui('state-badge');
  badge.textContent = meta.label;
  badge.className = `state-badge ${meta.cls}`;
  ui('state-copy').textContent = state.detectionState === 'CURIOUS' && state.guards.some(g => g.state === 'CURIOUS' && g.lurePos) ?
    'Following the brass coin.' : meta.copy;

  const pips = ui('bells').children;
  for (let i = 0; i < 3; i++) {
    pips[i].className = `bpip${i < state.bellCount ? (state.detectionState === 'BREACH' || state.bellCount >= 2 ? ' ring' : ' warn') : ''}`;
  }
  const bw = ui('bell-word');
  bw.textContent = state.bellCount === 0 ? 'HUSHED' : state.bellCount === 1 ? 'TOLLED' : state.bellCount === 2 ? 'HIGH' : 'LOCKED';
  bw.className = `bell-word ${state.bellCount >= 1 ? 'crimson' : ''}`;

  const ew = ui('exp-word'), ef = ui('exp-fill');
  if (p.inVeil) { ew.textContent = 'VELVET VEIL'; ew.className = 'mval violet'; ef.className = 'mfill exp-shadow'; ef.style.width = '10%'; }
  else if (p.inDoused) { ew.textContent = 'DEEP SHADOW'; ew.className = 'mval emerald'; ef.className = 'mfill exp-shadow'; ef.style.width = '10%'; }
  else if (p.inLight) { ew.textContent = 'LIT POOL'; ew.className = 'mval amber'; ef.className = 'mfill exp-light'; ef.style.width = `${Math.round(Math.max(72, p.exposure * 100))}%`; }
  else { ew.textContent = 'DEEP SHADOW'; ew.className = 'mval emerald'; ef.className = 'mfill exp-shadow'; ef.style.width = `${Math.round(Math.max(12, p.exposure * 100))}%`; }

  const nw = ui('noise-word'), nf = ui('noise-fill');
  const loud = p.noise >= 48 || state.detectionState === 'BREACH';
  nw.textContent = loud ? 'ECHOING' : p.noise >= 24 ? 'SOFT' : 'SILENT';
  nw.className = `mval ${loud ? 'crimson' : 'cyan'}`;
  nf.className = `mfill ${loud ? 'noise-loud' : 'noise-calm'}`;
  nf.style.width = `${Math.min(100, Math.max(10, Math.round(loud ? Math.max(85, p.noise) : p.noise)))}%`;

  const objR = ui('obj-relics');
  ui('obj-relics-txt').textContent = `Relics (${state.relicsTaken}/${state.relicsTotal})`;
  objR.className = `oc-row${state.relicsTaken >= 2 ? ' done' : ''}`;
  objR.querySelector('.oc-box').textContent = state.relicsTaken >= 2 ? '✓' : '○';

  const objO = ui('obj-opal');
  objO.className = `oc-row ${state.opalTaken ? 'done' : 'active'}`;
  objO.querySelector('.oc-box').textContent = state.opalTaken ? '✓' : '▸';

  const objE = ui('obj-elevator');
  objE.className = `oc-row ${state.opalTaken ? 'active' : ''}`;
  objE.querySelector('.oc-box').textContent = state.opalTaken ? '▸' : '○';

  ui('coins-val').textContent = `×${state.coins}`;
  ui('veils-val').textContent = `×${state.veils}`;
  ui('douse-val').textContent = p.lampInRange ? 'READY' : `${state.dousedCount} OFF`;
  ui('gbox-douse').className = `gbox${p.lampInRange ? ' hot' : ''}`;
  ui('vent-val').textContent = p.ventInRange ? 'ENTER' : 'LINKED';
  ui('gbox-vent').className = `gbox${p.ventInRange ? ' hot' : ''}`;

  const sorted = [...state.guards].sort((a, b) => ({ BREACH: 3, SWEEPING: 2, CURIOUS: 1, PATROL: 0 }[b.state] || 0) - ({ BREACH: 3, SWEEPING: 2, CURIOUS: 1, PATROL: 0 }[a.state] || 0));
  ui('curators-live').innerHTML = sorted.slice(0, 3).map((g, idx) => {
    const role = g.type === 'inspector' ? 'INSPECTOR' : g.type === 'docent' ? 'DOCENT' : 'CURATOR';
    const stKey = g.state === 'BREACH' ? 'breach' : g.state === 'SWEEPING' ? 'sweeping' : g.state === 'CURIOUS' ? 'curious' : 'patrol';
    const stLabel = g.state === 'BREACH' ? 'BREACH !' : g.state === 'SWEEPING' ? 'SWEEPING' : g.state === 'CURIOUS' ? 'CURIOUS ?' : 'PATROL';
    const pct = g.state === 'BREACH' ? 100 : g.state === 'SWEEPING' ? Math.max(66, Math.round(g.suspicion * 100)) : g.state === 'CURIOUS' ? Math.max(64, Math.round(g.suspicion * 100)) : 24;
    return `<div class="cur-card ${stKey}"><div class="cur-top"><span class="cur-name">${role} ${ROMANS[g.id] || idx + 1}</span><span class="cur-st ${stKey}">${stLabel}</span></div><div class="cur-bar"><div class="cur-fill ${stKey}" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

function renderDebriefLedger(state, onSelectWing) {
  const w = state.wing, ghost = state.wingAlerts === 0;
  const grade = state.campaign[state.wingIndex].grade;
  ui('dmt-wing').textContent = `WING ${w.roman} · ${w.title} — GOLDEN INFILTRATION TRAIL`;
  ui('deb-grade').textContent = grade;
  ui('deb-rating').textContent = `GHOST RATING: ${grade}`;
  ui('deb-subtitle').textContent = ghost ? `Unseen Phantom · ${w.title}` : `Velvet Escapee · ${w.title}`;
  ui('deb-time').textContent = formatTime(state.time);
  ui('deb-alerts').textContent = String(state.wingAlerts);
  ui('deb-alerts').className = `mono ${ghost ? 'emerald' : 'crimson'}`;
  ui('deb-doused').textContent = String(state.dousedCount);
  ui('deb-coins').textContent = String(state.coinsUsed);
  ui('deb-relics').textContent = `${state.relicsTaken} / ${state.relicsTotal}`;
  ui('deb-bonus').textContent = `+${state.ghostBonus.toLocaleString('en-US')}`;

  const list = ui('deb-wing-list');
  list.innerHTML = '';
  MUSEUM_WINGS.forEach((wg, idx) => {
    const rec = state.campaign[idx];
    const row = document.createElement('div');
    row.className = `dw-row${idx === state.wingIndex ? ' active' : ''}`;
    const tag = rec ? `RANK ${rec.grade}` : idx === state.wingIndex + 1 ? 'NEXT →' : 'LOCKED';
    const cls = rec ? '' : idx === state.wingIndex + 1 ? 'next' : 'lock';
    row.innerHTML = `<span class="dw-name">${wg.roman}. ${wingName(wg)}</span><span class="dw-tag ${cls}">${tag}</span>`;
    if (rec || idx <= state.wingIndex + 1) row.onclick = () => onSelectWing(idx);
    list.appendChild(row);
  });
}

function renderWingPicker(selectedIndex, onSelect) {
  const host = ui('title-wing-list');
  host.innerHTML = '';
  MUSEUM_WINGS.forEach((w, idx) => {
    const b = document.createElement('button');
    b.className = `wing-pill${idx === selectedIndex ? ' selected' : ''}`;
    b.innerHTML = `<strong>WING ${w.roman}</strong><span>${w.title.split(' ')[0]}</span>`;
    b.onclick = () => onSelect(idx);
    host.appendChild(b);
  });
}

function renderTacticsOverlay(state, onPick) {
  const grid = ui('tactics-cards');
  grid.innerHTML = '';
  state.draftOptions.forEach((pk, idx) => {
    const b = document.createElement('button');
    b.className = `draft-card${idx === 1 ? ' featured' : ''}`;
    b.innerHTML = `<span class="draft-tag">${pk.tag} [${idx + 1}]</span><div class="draft-name">${pk.name}</div><div class="draft-desc">${pk.desc}</div>`;
    b.onclick = () => onPick(pk);
    grid.appendChild(b);
  });
}

function setOverlay(mode) {
  ui('overlay-title').classList.toggle('hidden', mode !== 'title');
  ui('overlay-tactics').classList.toggle('hidden', mode !== 'tactics');
  ui('overlay-pause').classList.toggle('hidden', mode !== 'paused');
  ui('overlay-gameover').classList.toggle('hidden', mode !== 'gameover');
}

function showRibbonBanner(text, isDanger = false) {
  const el = ui('curfew-ribbon');
  el.textContent = text;
  el.className = `curfew-ribbon${isDanger ? '' : ' info'}`;
}

function hideRibbonBanner() { ui('curfew-ribbon').classList.add('hidden'); }
function setGameoverReason(msg) { ui('gameover-reason').textContent = msg; }
function setMuteLabel(muted) { ui('btn-mute').textContent = muted ? 'MUTED' : 'SFX'; }

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
