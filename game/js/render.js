// Velvet Curfew v2 — Painterly 2.5D Multi-Room Architectural Stealth Renderer (820x576)

import { STAGE_H, STAGE_W } from './levels.js';

const floorCache = new Map();

function getFloorCanvas(wing) {
  if (floorCache.has(wing.id)) return floorCache.get(wing.id);
  const off = document.createElement('canvas');
  off.width = STAGE_W;
  off.height = STAGE_H;
  const g = off.getContext('2d');

  // Deep nocturnal stone-indigo base
  g.fillStyle = '#0c111e';
  g.fillRect(0, 0, STAGE_W, STAGE_H);

  // Subtle architectural stone floor grid (28px tiles)
  const tile = 28;
  for (let y = 16; y < STAGE_H - 16; y += tile) {
    for (let x = 16; x < STAGE_W - 16; x += tile) {
      const alt = ((Math.floor(x / tile) + Math.floor(y / tile)) % 2) === 0;
      g.fillStyle = alt ? '#101727' : '#0d1322';
      g.fillRect(x, y, tile, tile);
      g.strokeStyle = 'rgba(255, 255, 255, 0.022)';
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
  }

  // Crimson velvet gallery carpets with brass border trim
  for (const c of wing.carpets || []) {
    const grad = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    grad.addColorStop(0, '#3e1522');
    grad.addColorStop(0.5, '#521b2b');
    grad.addColorStop(1, '#36111c');
    g.fillStyle = grad;
    g.fillRect(c.x, c.y, c.w, c.h);
    g.strokeStyle = 'rgba(212, 168, 79, 0.5)';
    g.lineWidth = 1.4;
    g.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
  }

  floorCache.set(wing.id, off);
  return off;
}

export function renderStage(ctx, state, nowSec) {
  const w = state.wing;
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);

  // 1. Pre-rendered stone & velvet museum floor
  ctx.drawImage(getFloorCanvas(w), 0, 0);

  // 2. Warm Chandelier Light Pools (bright warm amber pools contrasted against dark midnight corners)
  for (const l of w.lights) {
    const rad = l.r * (1 + Math.sin(nowSec * 1.8 + l.x * 0.02) * 0.018);
    const grad = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
    grad.addColorStop(0, 'rgba(255, 232, 170, 0.44)');
    grad.addColorStop(0.45, 'rgba(220, 178, 108, 0.22)');
    grad.addColorStop(0.82, 'rgba(160, 124, 72, 0.06)');
    grad.addColorStop(1, 'rgba(12, 17, 30, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Doorways (warm brass/wood thresholds inside wall openings)
  for (const d of w.doorways || []) {
    ctx.fillStyle = '#472c1e';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = '#d4a84f';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1);
  }

  // 4. Low Cover (Emerald Conservatory Planters & Velvet Benches — drawn under vision cones!)
  for (const o of w.obstacles) {
    if (o.kind === 'low') drawLowCover(ctx, o);
  }

  // 5. Raycast Vision Cones — Brass-Eye Cameras (Teal) + Guards (Steel / Gold / Orange / Crimson)
  for (const cam of state.cameras) drawCameraCone(ctx, cam);
  for (const g of state.guards) drawGuardCone(ctx, g);

  // 6. Pulsing Crimson Laser Tripwires
  for (const tw of state.tripwires) drawTripwire(ctx, tw, nowSec);

  // 7. Tall 3D-Extruded Architectural Walls, Glass Partitions, Crates & Pillars (slice cones cleanly!)
  for (const o of w.obstacles) {
    if (o.kind !== 'low') drawTallObstacle(ctx, o);
  }

  // 8. Ceiling Chandelier Bulbs (crisp glowing ivory-brass nodes)
  for (const l of w.lights) {
    ctx.fillStyle = '#181410';
    ctx.beginPath(); ctx.arc(l.x, l.y, 5.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath(); ctx.arc(l.x, l.y, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d4a84f';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(l.x, l.y, 5.8, 0, Math.PI * 2); ctx.stroke();
  }

  // 9. Bonus Gold Loot Stacks, Vault Ledger Diamond & Emerald Exit Portal
  drawLootAndObjectives(ctx, state, nowSec);

  // 10. Active Velvet Smoke Clouds
  for (const sm of state.smokesActive) drawSmokeCloud(ctx, sm, nowSec);

  // 11. Diegetic Stealth Callouts (Alarm waves & rally links, Last Seen X, Coin ripples & dashed line)
  drawDiegeticCallouts(ctx, state, nowSec);

  // Aim arc preview during live play
  if (state.mode === 'play' && !state.shotMode && state.aim.active && state.coins > 0) {
    drawAimArc(ctx, state);
  }

  // 12. Flying Brass Coins
  for (const c of state.coinsInFlight) {
    const u = Math.min(1, c.t / c.dur);
    const x = c.sx + (c.tx - c.sx) * u;
    const y = c.sy + (c.ty - c.sy) * u - Math.sin(u * Math.PI) * 32;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill();
  }

  // 13. Brass-Eye Camera Mounts, Infiltrator & Guards
  for (const cam of state.cameras) drawCameraNode(ctx, cam);
  drawInfiltrator(ctx, state, nowSec);
  for (const g of state.guards) drawGuard(ctx, g, nowSec);

  // 14. Sparkle Particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLowCover(ctx, o) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(o.x + 3, o.y + 4, o.w, o.h);
  // Lush botanical planter / velvet low cover segmented into 24px cells
  ctx.fillStyle = '#143c2c';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  const cols = Math.max(1, Math.round(o.w / 24));
  const rows = Math.max(1, Math.round(o.h / 24));
  const cw = o.w / cols, ch = o.h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = o.x + c * cw + 2.5, by = o.y + r * ch + 2.5;
      ctx.fillStyle = '#246b48';
      ctx.fillRect(bx, by, cw - 5, ch - 5);
      // Tiny pale botanical blossoms
      ctx.fillStyle = '#86efac';
      ctx.beginPath(); ctx.arc(bx + cw * 0.3, by + ch * 0.36, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + cw * 0.66, by + ch * 0.56, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
}

function drawTallObstacle(ctx, o) {
  // Grounded drop shadow
  ctx.fillStyle = 'rgba(2, 5, 14, 0.58)';
  ctx.fillRect(o.x + 5, o.y + 7, o.w, o.h);

  if (o.kind === 'wall') {
    // Architectural 3D-beveled slate-steel wall with clean top lip
    ctx.fillStyle = '#33415c';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#536587';
    ctx.fillRect(o.x, o.y, o.w, Math.min(o.h, 5));
    ctx.fillStyle = '#475878';
    ctx.fillRect(o.x + 2, o.y + 2, Math.max(0, o.w - 4), Math.max(0, o.h - 7));
    ctx.strokeStyle = '#1b2438';
    ctx.lineWidth = 1;
    ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    return;
  }

  if (o.kind === 'glass') {
    // Glasshouse conservatory divider panes (transparent to sight!)
    ctx.fillStyle = 'rgba(30, 52, 78, 0.65)';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = 'rgba(148, 197, 232, 0.52)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    const horizontal = o.w > o.h;
    const step = 18;
    const count = Math.max(1, Math.floor((horizontal ? o.w : o.h) / step));
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.34)';
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const px = horizontal ? o.x + i * step : o.x;
      const py = horizontal ? o.y : o.y + i * step;
      const pw = horizontal ? step : o.w;
      const ph = horizontal ? o.h : step;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.beginPath();
      ctx.moveTo(px + 4, py + ph - 4);
      ctx.lineTo(px + pw - 4, py + 4);
      ctx.stroke();
    }
    return;
  }

  // Tall Mahogany Crate / Marble Pillar (blocks sightlines completely!)
  const isCrate = o.kind === 'crate';
  const cols = isCrate ? Math.max(1, Math.round(o.w / 26)) : 1;
  const rows = isCrate ? Math.max(1, Math.round(o.h / 26)) : 1;
  const cw = o.w / cols, ch = o.h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = o.x + c * cw, by = o.y + r * ch;
      ctx.fillStyle = isCrate ? '#4f2e1d' : '#253453';
      ctx.fillRect(bx, by, cw, ch);
      ctx.fillStyle = isCrate ? '#6e4228' : '#334870';
      ctx.fillRect(bx + 2, by + 2, cw - 4, ch - 6);
      if (isCrate) {
        ctx.strokeStyle = '#382012';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx + 3, by + 3); ctx.lineTo(bx + cw - 3, by + ch - 5);
        ctx.moveTo(bx + cw - 3, by + 3); ctx.lineTo(bx + 3, by + ch - 5);
        ctx.stroke();
      }
      ctx.strokeStyle = isCrate ? '#a66d42' : '#d4a84f';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bx + 0.5, by + 0.5, cw - 1, ch - 1);
    }
  }
}

function drawCameraCone(ctx, cam) {
  const poly = cam.visionPoly;
  if (!poly || poly.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();

  const grad = ctx.createRadialGradient(cam.x, cam.y, 4, cam.x, cam.y, cam.range);
  grad.addColorStop(0, cam.alerting ? 'rgba(239, 68, 68, 0.5)' : 'rgba(45, 212, 191, 0.44)');
  grad.addColorStop(0.65, cam.alerting ? 'rgba(239, 68, 68, 0.22)' : 'rgba(45, 212, 191, 0.18)');
  grad.addColorStop(1, 'rgba(45, 212, 191, 0.04)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = cam.alerting ? 'rgba(252, 165, 165, 0.85)' : 'rgba(94, 234, 212, 0.72)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawGuardCone(ctx, g) {
  const poly = g.visionPoly;
  if (!poly || poly.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();

  const grad = ctx.createRadialGradient(g.x, g.y, 6, g.x, g.y, g.spec.visionRange);
  let stroke = 'rgba(186, 212, 240, 0.45)';
  if (g.state === 'ALARM') {
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.56)');
    grad.addColorStop(0.65, 'rgba(220, 38, 38, 0.28)');
    grad.addColorStop(1, 'rgba(185, 28, 28, 0.08)');
    stroke = 'rgba(252, 165, 165, 0.88)';
  } else if (g.state === 'SEARCHING') {
    grad.addColorStop(0, 'rgba(251, 146, 60, 0.56)');
    grad.addColorStop(0.65, 'rgba(234, 88, 12, 0.26)');
    grad.addColorStop(1, 'rgba(194, 65, 12, 0.06)');
    stroke = 'rgba(253, 186, 116, 0.85)';
  } else if (g.state === 'SUSPICIOUS') {
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.48)');
    grad.addColorStop(0.65, 'rgba(234, 179, 8, 0.24)');
    grad.addColorStop(1, 'rgba(202, 138, 4, 0.06)');
    stroke = 'rgba(254, 240, 138, 0.85)';
  } else {
    grad.addColorStop(0, 'rgba(165, 198, 232, 0.34)');
    grad.addColorStop(0.65, 'rgba(128, 164, 204, 0.16)');
    grad.addColorStop(1, 'rgba(100, 134, 176, 0.04)');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = g.state === 'PATROL' ? 1.2 : 1.7;
  ctx.stroke();
  ctx.restore();
}

function drawTripwire(ctx, tw, nowSec) {
  ctx.save();
  if (tw.active) {
    const pulse = 0.78 + 0.22 * Math.sin(nowSec * 12);
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 * pulse})`;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(tw.x1, tw.y1); ctx.lineTo(tw.x2, tw.y2); ctx.stroke();

    ctx.strokeStyle = `rgba(254, 202, 202, ${0.95 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tw.x1, tw.y1); ctx.lineTo(tw.x2, tw.y2); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(tw.x1, tw.y1); ctx.lineTo(tw.x2, tw.y2); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const [ex, ey] of [[tw.x1, tw.y1], [tw.x2, tw.y2]]) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tw.active ? '#ef4444' : '#64748b';
    ctx.beginPath(); ctx.arc(ex, ey, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawLootAndObjectives(ctx, state, nowSec) {
  // Bonus gold coin stacks
  for (const it of state.lootItems) {
    if (it.taken) continue;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.ellipse(0, 3, 6.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.ellipse(0, -3, 6.2, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Vault Ledger gleaming diamond objective
  const L = state.wing.ledger;
  if (!state.ledgerStolen) {
    const pulse = 0.5 + 0.5 * Math.sin(nowSec * 4.2);
    ctx.save();
    ctx.translate(L.x, L.y);
    const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 26 + pulse * 6);
    gl.addColorStop(0, 'rgba(250, 204, 21, 0.58)');
    gl.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }

  // Glowing Emerald Roof Exit Portal
  const ex = state.wing.exit;
  const open = state.ledgerStolen;
  ctx.save();
  ctx.translate(ex.x, ex.y);
  const eg = ctx.createRadialGradient(0, 0, 3, 0, 0, 34);
  eg.addColorStop(0, open ? 'rgba(34, 197, 94, 0.55)' : 'rgba(34, 197, 94, 0.28)');
  eg.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = open ? 'rgba(22, 163, 74, 0.36)' : 'rgba(16, 60, 40, 0.65)';
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 2.2;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeRect(-16, -16, 32, 32);

  // Play/Exit triangle glyph
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.moveTo(-5, -7); ctx.lineTo(8, 0); ctx.lineTo(-5, 7); ctx.closePath();
  ctx.fill();

  ctx.font = '800 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dcfce7';
  ctx.fillText('EXIT', 0, -21);
  ctx.restore();
}

function drawSmokeCloud(ctx, sm, nowSec) {
  ctx.save();
  ctx.globalAlpha = sm.alpha;
  const puffs = [
    { ox: 0, oy: 0, s: 1.0 },
    { ox: Math.cos(nowSec * 0.9) * 14, oy: Math.sin(nowSec * 0.8) * 10, s: 0.72 },
    { ox: -14, oy: 8, s: 0.68 },
    { ox: 12, oy: -10, s: 0.64 },
  ];
  for (const pf of puffs) {
    const r = sm.r * pf.s;
    const gr = ctx.createRadialGradient(sm.x + pf.ox, sm.y + pf.oy, 3, sm.x + pf.ox, sm.y + pf.oy, r);
    gr.addColorStop(0, 'rgba(76, 52, 126, 0.86)');
    gr.addColorStop(0.62, 'rgba(38, 26, 74, 0.7)');
    gr.addColorStop(1, 'rgba(20, 14, 44, 0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(sm.x + pf.ox, sm.y + pf.oy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.45)';
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.r * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawDiegeticCallouts(ctx, state, nowSec) {
  // 1. Coin Acoustic Ripples + Dashed Guard-to-Coin Line + "WHAT WAS THAT?"
  for (const g of state.guards) {
    if (g.lurePos) {
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.82)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.lurePos.x, g.lurePos.y); ctx.stroke();
      ctx.restore();
    }
  }

  for (const rp of state.ripples) {
    ctx.save();
    const isCoin = rp.kind === 'coin';
    ctx.strokeStyle = isCoin ? `rgba(250, 204, 21, ${rp.alpha})` : `rgba(56, 189, 248, ${rp.alpha * 0.75})`;
    ctx.lineWidth = isCoin ? 2.1 : 1.3;
    if (!isCoin) ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
    if (isCoin) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(rp.x, rp.y, 4, 0, Math.PI * 2); ctx.fill();
      if (rp.label) drawTag(ctx, rp.x, rp.y - 18, rp.label, '#fef08a', 'rgba(11, 17, 32, 0.92)', '#d4a84f');
    }
    ctx.restore();
  }

  // 2. Live Alarm Shockwaves + Rally Lines + "ANSWERING ALARM"
  if (state.alarmOrigin) {
    const { x, y } = state.alarmOrigin;
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const r = 34 + k * 42 + ((nowSec * 36) % 24);
      ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0.15, 0.65 - k * 0.18)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.6;
    for (const ln of state.alarmLinks || []) {
      ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(ln.x2, ln.y2); ctx.stroke();
    }
    ctx.restore();
    drawTag(ctx, x, y - 28, 'ANSWERING ALARM', '#fef2f2', 'rgba(69, 10, 10, 0.94)', '#ef4444');
  }

  // 3. Searching "X LAST SEEN" Marker
  if (state.lastSeen && !state.alarmOrigin) {
    const { x, y } = state.lastSeen;
    ctx.save();
    ctx.strokeStyle = '#fb923c';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
    ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
    ctx.stroke();
    ctx.restore();
    drawTag(ctx, x, y + 24, 'LAST SEEN', '#fed7aa', 'rgba(46, 18, 4, 0.92)', '#fb923c');
  }
}

function drawCameraNode(ctx, cam) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cam.alerting ? '#ef4444' : '#d4a84f';
  ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cam.alerting ? '#fee2e2' : '#2dd4bf';
  ctx.beginPath(); ctx.arc(Math.cos(cam.angle) * 3, Math.sin(cam.angle) * 3, 2.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawInfiltrator(ctx, state, nowSec) {
  const p = state.player;
  const hidden = p.inShadow || p.inSmoke || (p.inLowCover && p.crouched);
  ctx.save();
  ctx.translate(p.x, p.y);

  // Glowing dashed stealth ring
  ctx.strokeStyle = hidden ? '#38bdf8' : '#fef08a';
  ctx.lineWidth = 2;
  if (hidden) ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(0, 0, p.r + 5, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Sleek Art-Deco cloaked infiltrator cowl + brass visor chevron
  ctx.rotate(p.angle);
  ctx.fillStyle = '#0c273b';
  ctx.strokeStyle = hidden ? '#7dd3fc' : '#f4ead5';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(-1, 0, p.r - 0.5, p.r + 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.ledgerStolen ? '#facc15' : '#bae6fd';
  ctx.beginPath();
  ctx.moveTo(7.2, 0); ctx.lineTo(1.5, -4.4); ctx.lineTo(3.2, 0); ctx.lineTo(1.5, 4.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (hidden && state.detectionState !== 'ALARM') {
    drawTag(ctx, p.x, p.y + 23, p.inSmoke ? 'SMOKED' : 'HIDDEN', '#7dd3fc', 'rgba(8, 22, 38, 0.92)', '#38bdf8');
  }
}

function drawGuard(ctx, g, nowSec) {
  ctx.save();
  ctx.translate(g.x, g.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath(); ctx.arc(2, 4, g.r + 1, 0, Math.PI * 2); ctx.fill();

  const fill = g.state === 'ALARM' ? '#ef4444' : g.state === 'SEARCHING' ? '#fb923c' : g.spec.color;
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, 0, g.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Crisp dark directional chevron arrow inside guard circle
  ctx.rotate(g.angle);
  ctx.fillStyle = '#0b1120';
  ctx.beginPath();
  ctx.moveTo(6.5, 0); ctx.lineTo(-4.5, -5.2); ctx.lineTo(-2.2, 0); ctx.lineTo(-4.5, 5.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // High-contrast circular overhead ? or ! badge
  if (g.state === 'ALARM' || g.state === 'SUSPICIOUS' || g.state === 'SEARCHING') {
    const isExcl = g.state === 'ALARM';
    const bx = g.x, by = g.y - 23;
    ctx.save();
    ctx.fillStyle = isExcl ? '#ef4444' : '#facc15';
    ctx.strokeStyle = '#0b1120';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isExcl ? '#ffffff' : '#0b1120';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isExcl ? '!' : '?', bx, by + 0.5);
    ctx.restore();
  }
}

function drawAimArc(ctx, state) {
  const p = state.player;
  const maxD = 230 * state.mods.throwRangeMult;
  let dx = state.aim.x - p.x, dy = state.aim.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 22) return;
  if (d > maxD) { dx = (dx / d) * maxD; dy = (dy / d) * maxD; }
  const tx = p.x + dx, ty = p.y + dy;
  ctx.save();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.52)';
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo((p.x + tx) / 2, (p.y + ty) / 2 - 22, tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawTag(ctx, x, y, text, fg, bg, border) {
  ctx.save();
  ctx.font = '800 10px ui-monospace, SFMono-Regular, monospace';
  const tw = ctx.measureText(text).width + 12;
  const bx = Math.max(18, Math.min(STAGE_W - tw - 18, x - tw / 2));
  const by = Math.max(18, Math.min(STAGE_H - 22, y - 8));
  ctx.fillStyle = bg;
  ctx.fillRect(bx, by, tw, 17);
  ctx.strokeStyle = border || fg;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 16);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, by + 9);
  ctx.restore();
}
