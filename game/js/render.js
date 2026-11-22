// Velvet Curfew — Art-Deco 2.5D Museum Renderer, Dynamic Lamp Pools, Raycast Cones & Footstep Sonar

import { STAGE_H, STAGE_W } from './levels.js';

export {renderMuseumStage};

const floorCache = new Map();
let shadowHatch;
let labelBounds; // Stage-space plaques and actors the next speech slip must leave clear.

function renderMuseumStage(ctx, state, nowSec) {
  const w = state.wing;
  const review = state.mode === 'debrief';
  labelBounds = state.mode === 'play' ? [] : null;
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);
  ctx.drawImage(getMuseumFloor(w), 0, 0);
  for (const a of w.alcoves || []) drawShadowAlcove(ctx, a);
  drawDynamicLampPools(ctx, state, nowSec);
  drawBrassVents(ctx, w.vents || [], state, nowSec);
  for (const ar of w.arches || []) drawArtDecoArch(ctx, ar);
  if (state.mode !== 'debrief') drawCoverBlindSpots(ctx, state);
  for (const o of w.obstacles) if (o.kind === 'settee') drawVelvetSettee(ctx, o);
  if (state.mode !== 'debrief') drawPatrolTracks(ctx, state.guards);
  drawRaycastCones(ctx, state);
  for (const tw of state.tripwires) drawTripwire(ctx, tw, nowSec);
  for (const o of w.obstacles) if (o.kind !== 'settee') drawTallMuseumProp(ctx, o);
  drawSconceFixtures(ctx, state);
  drawOpalAndRelics(ctx, state, nowSec);
  if (!review) drawBrassElevator(ctx, state, nowSec);
  for (const sm of state.veilsActive) drawVelvetVeil(ctx, sm, nowSec, state.player.inVeil && veilHolds(sm, state.player));
  if (!review) drawTacticalOverlays(ctx, state, nowSec);
  if (!review && state.player.ventInRange) {
    for (const v of w.vents) {
      const here = Math.hypot(state.player.x-v.x, state.player.y-v.y) < 54;
      drawTag(ctx, v.x, v.y+23, 'VENT [V]', here ? '#03222b' : '#5eead4', here ? '#67e8f9' : '#09141c', here ? '#ecfeff' : '#2dd4bf');
    }
  }
  if (state.mode === 'play' && !state.shotMode && state.aim.active && state.coins > 0) drawAimArc(ctx, state);
  for (const c of state.coinsInFlight) {
    const u = Math.min(1, c.t / c.dur);
    const x = c.sx + (c.tx - c.sx) * u, y = c.sy + (c.ty - c.sy) * u - Math.sin(u * Math.PI) * 34;
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(x, y, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (const cam of state.cameras) drawCameraDome(ctx, cam);
  if (!review) drawGuardFootstepSonar(ctx, state);
  if (state.mode !== 'debrief') drawInfiltrator(ctx, state);
  for (const g of state.guards) drawGuard(ctx, g);
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (labelBounds) drawGuardBarks(ctx, state);
  if (review) {
    ctx.fillStyle = 'rgba(3, 11, 20, 0.38)'; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    drawGoldenTrail(ctx, state.debriefTrail);
    drawBrassElevator(ctx, state, nowSec);
  }
}

function drawDynamicLampPools(ctx, state, nowSec) {
  for (const l of state.lights) {
    if (l.lit) {
      const rad = l.r * (1 + Math.sin(nowSec * 1.7 + l.x * 0.02) * 0.015);
      const gr = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
      gr.addColorStop(0, 'rgba(255, 224, 120, 0.68)');
      gr.addColorStop(0.34, 'rgba(238, 180, 68, 0.40)');
      gr.addColorStop(0.68, 'rgba(196, 134, 38, 0.15)');
      gr.addColorStop(1, 'rgba(6, 9, 17, 0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(246, 216, 138, 0.24)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad * 0.66, 0, Math.PI * 2); ctx.stroke();
    } else {
      const rad = l.r * 0.60;
      const dg = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
      dg.addColorStop(0, 'rgba(2, 4, 11, 0.90)');
      dg.addColorStop(0.68, 'rgba(4, 8, 19, 0.64)');
      dg.addColorStop(1, 'rgba(4, 8, 19, 0)');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.54)';
      ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad * 0.80, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawGuardFootstepSonar(ctx, { guardSteps, guards, player, wing }) {
  for (const s of guardSteps) {
    const g = guards[s.by];
    ctx.save();
    ctx.strokeStyle = `rgba(${s.danger ? '255, 196, 92' : '255, 240, 208'}, ${Math.sqrt(s.alpha)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, s.r, 0, Math.PI * 2); ctx.stroke();
    if (s.label) {
      const nx = -Math.sin(g.angle), ny = Math.cos(g.angle);
      const d = (49 + 15 * Math.abs(nx)) * Math.sign(nx * (player.x - g.x) + ny * (player.y - g.y) || 1);
      const walled = wing.obstacles.some((o) => Math.abs(g.x + nx * d - o.x - o.w / 2) < o.w / 2 + 28 && Math.abs(g.y + ny * d - o.y - o.h / 2) < o.h / 2 + 13);
      const side = walled ? -d : d;
      ctx.translate(g.x + nx * side, g.y + ny * side); ctx.scale(0.8, 0.8);
      drawTag(ctx, 0, 0, s.label, '#fff0d0', '#1c1509', '#f2c261', false, 'pill');
    }
    ctx.restore();
  }
}

function drawRaycastCones(ctx, state) {
  for (const cam of state.cameras) drawCameraCone(ctx, cam);
  for (const g of state.guards) drawGuardCone(ctx, g);
}

function drawCoverBlindSpots(ctx, state) {
  const eyes = [...state.guards, ...state.cameras];
  const wedges = new Path2D();
  let hasShadow = false;
  for (const { visionPoly: poly } of eyes) {
    for (let i = 2; i < poly.length; i++) {
      const prev = poly[i - 1], next = poly[i];
      const a = prev.shadow, b = next.shadow;
      if (!a || !b || prev.blocker !== next.blocker) continue;
      wedges.moveTo(a.x, a.y); wedges.lineTo(b.x, b.y);
      wedges.lineTo(b.ex, b.ey); wedges.lineTo(a.ex, a.ey); wedges.closePath();
      hasShadow = true;
    }
  }
  if (!hasShadow) return;
  if (!shadowHatch) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 24;
    const t = tile.getContext('2d');
    t.fillStyle = 'rgba(5, 60, 49, 0.58)'; t.fillRect(0, 0, 24, 24);
    t.lineWidth = 1.7; t.strokeStyle = 'rgba(114, 243, 199, 0.80)';
    t.beginPath();
    for (let x = 0; x <= 48; x += 12) { t.moveTo(x, 0); t.lineTo(x - 24, 24); }
    t.stroke();
    t.lineWidth = 1; t.strokeStyle = 'rgba(114, 243, 199, 0.24)';
    t.beginPath(); t.moveTo(0, 0); t.lineTo(24, 24); t.stroke();
    shadowHatch = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  // A blind spot for one curator is not safe if a second lantern or camera can see it.
  for (const { visionPoly: poly } of eyes) {
    ctx.beginPath(); ctx.rect(0, 0, STAGE_W, STAGE_H);
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath(); ctx.clip('evenodd');
  }
  ctx.fillStyle = shadowHatch; ctx.fill(wedges);
  ctx.restore();
}

function drawPatrolTracks(ctx, guards) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px Georgia, serif';
  for (const { waypoints: pts } of guards) {
    ctx.strokeStyle = 'rgba(251, 214, 145, 0.69)'; ctx.lineWidth = 2.4;
    ctx.setLineDash([0.3, 10]);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (pts.length > 2) ctx.closePath();
    ctx.stroke(); ctx.setLineDash([]);
    for (const wp of pts) {
      ctx.fillStyle = '#211d18'; ctx.strokeStyle = '#d1b477'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(wp.x, wp.y, 11.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff0c9'; ctx.fillText(`${wp.pause}s`, wp.x, wp.y + 0.7);
      labelBounds?.push([wp.x-12, wp.y-12, wp.x+12, wp.y+12]);
    }
  }
  ctx.restore();
}

function getMuseumFloor(wing) {
  if (floorCache.has(wing.id)) return floorCache.get(wing.id);
  const off = document.createElement('canvas');
  off.width = STAGE_W;
  off.height = STAGE_H;
  const g = off.getContext('2d');

  g.fillStyle = '#060911';
  g.fillRect(0, 0, STAGE_W, STAGE_H);

  const step = 38;
  for (let y = -step; y < STAGE_H + step; y += step) {
    for (let x = -step; x < STAGE_W + step; x += step) {
      const alt = ((Math.floor(x / step) + Math.floor(y / step)) & 1) === 0;
      g.fillStyle = alt ? '#0b101d' : '#060911';
      g.beginPath();
      g.moveTo(x + step / 2, y);
      g.lineTo(x + step, y + step / 2);
      g.lineTo(x + step / 2, y + step);
      g.lineTo(x, y + step / 2);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(201, 162, 82, 0.05)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }

  // Subtle perimeter gilded Art-Deco floor border
  g.strokeStyle = 'rgba(201, 162, 82, 0.24)';
  g.lineWidth = 1.2;
  g.strokeRect(24, 24, STAGE_W - 48, STAGE_H - 48);
  g.strokeRect(30, 30, STAGE_W - 60, STAGE_H - 60);

  // Deeper nocturnal crimson velvet carpet runners with brass filigree
  for (const c of wing.carpets || []) {
    const grad = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    grad.addColorStop(0, '#360c17');
    grad.addColorStop(0.5, '#4b1120');
    grad.addColorStop(1, '#310a14');
    g.fillStyle = grad;
    g.fillRect(c.x, c.y, c.w, c.h);

    // Subtle diamond damask carpet weave
    g.strokeStyle = 'rgba(240, 208, 132, 0.08)';
    g.lineWidth = 0.9;
    for (let cx = c.x + 16; cx < c.x + c.w - 8; cx += 28) {
      for (let cy = c.y + 16; cy < c.y + c.h - 8; cy += 28) {
        g.beginPath();
        g.moveTo(cx, cy - 6); g.lineTo(cx + 6, cy); g.lineTo(cx, cy + 6); g.lineTo(cx - 6, cy);
        g.closePath(); g.stroke();
      }
    }

    // Stepped double brass border
    g.strokeStyle = 'rgba(201, 162, 82, 0.72)';
    g.lineWidth = 1.6;
    g.strokeRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    g.strokeStyle = 'rgba(244, 236, 224, 0.24)';
    g.lineWidth = 0.9;
    g.strokeRect(c.x + 8, c.y + 8, c.w - 16, c.h - 16);
  }

  // Grand Octagonal Rotunda Floor Medallion etched in brass
  if (wing.rotunda) {
    const { x, y, r } = wing.rotunda;
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(18, 23, 36, 0.78)';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      i === 0 ? g.moveTo(Math.cos(a) * r, Math.sin(a) * r) : g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(201, 162, 82, 0.58)';
    g.lineWidth = 1.8;
    g.stroke();

    // Inner sunburst rings & 16 Art-Deco rays
    g.strokeStyle = 'rgba(201, 162, 82, 0.34)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, r * 0.76, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.45, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      g.beginPath();
      g.moveTo(Math.cos(a) * (r * 0.45), Math.sin(a) * (r * 0.45));
      g.lineTo(Math.cos(a) * (r * 0.9), Math.sin(a) * (r * 0.9));
      g.stroke();
    }
    g.restore();
  }

  floorCache.set(wing.id, off);
  return off;
}

function drawSconceFixtures(ctx, state) {
  const p = state.player, calm = labelBounds && !state.lastGlimpse;
  const gap = (l) => Math.hypot(l.x - p.x, l.y - p.y);
  const nearest = state.lights.filter((l) => l.lit).sort((a, b) => gap(a) - gap(b))[0];
  for (const l of state.lights) {
    if (calm && (l === nearest || !l.lit)) {
      const y = l.y + 24, [text, ink, fill, hue] = l.lit ? ['LIT · SEEN', '#3a2404', '#ffd166', '#ffe9ad'] : ['DOUSED · SAFE', '#c4ffe9', '#151e55', '#6ee7c8'];
      const side = labelBounds.some(([a, t, r, b]) => l.x < r && l.x + 172 > a && y - 14 < b && y + 14 > t) ? -1 : 1;
      ctx.strokeStyle = hue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, y); ctx.stroke();
      drawTag(ctx, l.x - side * 8, y, text, ink, fill, hue, true, 'pill', side);
    }
    ctx.save();
    ctx.translate(l.x, l.y);
    if (l.lit) {
      ctx.fillStyle = '#20180f';
      ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a252'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath(); ctx.arc(0, 0, 3.3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#0f1420';
      ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
      ctx.beginPath(); ctx.arc(5, -7, 4, 0.4, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4, -10, 3, 1.0, Math.PI * 1.9); ctx.stroke();
      if (!calm && state.mode !== 'debrief') {
        drawTag(ctx, 0, 18, 'DOUSED', '#93c5fd', 'rgba(9, 15, 28, 0.92)', '#38bdf8', false);
      }
    }
    ctx.restore();
  }
}

function drawShadowAlcove(ctx, a) {
  ctx.save();
  // Deep indigo twilight shadow pool
  ctx.fillStyle = 'rgba(5, 8, 18, 0.64)';
  ctx.fillRect(a.x, a.y, a.w, a.h);
  // Subtle Art-Deco chevron twilight hatching
  ctx.beginPath(); ctx.rect(a.x, a.y, a.w, a.h); ctx.clip();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let k = -a.h; k < a.w + a.h; k += 14) {
    ctx.beginPath(); ctx.moveTo(a.x + k, a.y); ctx.lineTo(a.x + k - a.h, a.y + a.h); ctx.stroke();
  }
  ctx.restore();

  // Velvet stanchion rope posts on the 4 corners + draped burgundy rope border
  ctx.save();
  ctx.strokeStyle = 'rgba(159, 45, 68, 0.72)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 4]);
  ctx.strokeRect(a.x + 2, a.y + 2, a.w - 4, a.h - 4);
  ctx.setLineDash([]);
  for (const [px, py] of [[a.x + 2, a.y + 2], [a.x + a.w - 2, a.y + 2], [a.x + 2, a.y + a.h - 2], [a.x + a.w - 2, a.y + a.h - 2]]) {
    ctx.fillStyle = '#c9a252';
    ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawArtDecoArch(ctx, ar) {
  ctx.save();
  // Warm polished brass-threshold floor strip + curved Art-Deco arch fanlight lines
  ctx.fillStyle = '#252019';
  ctx.fillRect(ar.x, ar.y, ar.w, ar.h);
  ctx.strokeStyle = '#c9a252';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(ar.x + 0.5, ar.y + 0.5, ar.w - 1, ar.h - 1);
  // Curved Art-Deco brass transom arc across threshold
  ctx.strokeStyle = 'rgba(240, 208, 132, 0.65)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (ar.orient === 'h') {
    ctx.arc(ar.x + ar.w / 2, ar.y + ar.h, ar.w * 0.42, Math.PI * 1.08, Math.PI * 1.92);
  } else {
    ctx.arc(ar.x + ar.w, ar.y + ar.h / 2, ar.h * 0.42, Math.PI * 0.58, Math.PI * 1.42);
  }
  ctx.stroke();
  ctx.restore();
}

function drawVelvetSettee(ctx, o) {
  // Tufted crimson velvet museum gallery bench / settee with curved brass armrests
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.fillRect(o.x + 4, o.y + 5, o.w, o.h);

  // Brass frame & curved end bolsters
  ctx.fillStyle = '#6f182a';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.fillStyle = '#8f2036';
  ctx.fillRect(o.x + 5, o.y + 3, o.w - 10, o.h - 6);

  // Diamond velvet button tufting
  ctx.strokeStyle = 'rgba(240, 208, 132, 0.32)';
  ctx.lineWidth = 0.9;
  const tufts = Math.max(2, Math.floor((o.w - 14) / 16));
  for (let i = 0; i < tufts; i++) {
    const tx = o.x + 12 + (i * (o.w - 24)) / Math.max(1, tufts - 1);
    const ty = o.y + o.h / 2;
    ctx.fillStyle = '#f0d084';
    ctx.beginPath(); ctx.arc(tx, ty, 1.7, 0, Math.PI * 2); ctx.fill();
  }

  // Brass scroll armrests on left & right ends
  ctx.fillStyle = '#c9a252';
  ctx.fillRect(o.x, o.y + 1, 5, o.h - 2);
  ctx.fillRect(o.x + o.w - 5, o.y + 1, 5, o.h - 2);
  ctx.strokeStyle = '#f0d084';
  ctx.lineWidth = 1.1;
  ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
  ctx.restore();
}

function drawTallMuseumProp(ctx, o) {
  // Grounded drop shadow
  ctx.fillStyle = 'rgba(3, 5, 12, 0.62)';
  ctx.fillRect(o.x + 5, o.y + 7, o.w, o.h);

  if (o.kind === 'wall') {
    // Stepped Art-Deco Masonry Wall (#2c3347) with Gilded Brass Crown Trim (#c9a252)
    ctx.fillStyle = '#22283a';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#2f374e';
    ctx.fillRect(o.x + 2, o.y + 2, Math.max(0, o.w - 4), Math.max(0, o.h - 6));
    // Stepped brass inlay trim line
    ctx.strokeStyle = '#c9a252';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    ctx.strokeStyle = 'rgba(244, 236, 224, 0.22)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(o.x + 4, o.y + 4, Math.max(0, o.w - 8), Math.max(0, o.h - 8));
    return;
  }

  if (o.kind === 'column') {
    // Octagonal Fluted Ivory-Marble Atrium Column with brass capital ring
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const rx = o.w * 0.5, ry = o.h * 0.5;
    const cut = o.w * 0.28;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(o.x + cut, o.y); ctx.lineTo(o.x + o.w - cut, o.y);
    ctx.lineTo(o.x + o.w, o.y + cut); ctx.lineTo(o.x + o.w, o.y + o.h - cut);
    ctx.lineTo(o.x + o.w - cut, o.y + o.h); ctx.lineTo(o.x + cut, o.y + o.h);
    ctx.lineTo(o.x, o.y + o.h - cut); ctx.lineTo(o.x, o.y + cut);
    ctx.closePath();
    const gr = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
    gr.addColorStop(0, '#e8dfd1');
    gr.addColorStop(0.55, '#c5bba9');
    gr.addColorStop(1, '#7c7468');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = '#c9a252';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Inner fluted gilded medallion cap
    ctx.fillStyle = '#f4ece0';
    ctx.beginPath(); ctx.arc(cx, cy - 1, rx * 0.56, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b38938'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#c9a252';
    ctx.beginPath(); ctx.arc(cx, cy - 1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  if (o.kind === 'vitrine') {
    // Gilded Mahogany & Glass Display Vitrine with diagonal pale-teal/gold glass reflection sheen
    ctx.save();
    // Mahogany plinth base
    ctx.fillStyle = '#3c1e19';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    // Glass case top
    const vg = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
    vg.addColorStop(0, '#24475a');
    vg.addColorStop(0.5, '#192b3a');
    vg.addColorStop(1, '#2d586e');
    ctx.fillStyle = vg;
    ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);

    // Glinting diagonal glass reflection ribbons
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + 12, o.y + o.h - 6); ctx.lineTo(o.x + 26, o.y + 6);
    ctx.moveTo(o.x + o.w - 28, o.y + o.h - 6); ctx.lineTo(o.x + o.w - 14, o.y + 6);
    ctx.stroke();

    // Tiny gleaming gold artifact silhouette sealed inside the glass vitrine
    ctx.fillStyle = 'rgba(240, 208, 132, 0.72)';
    ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 4.5, 0, Math.PI * 2); ctx.fill();

    // Brass corner brackets
    ctx.strokeStyle = '#e5be67';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    ctx.fillStyle = '#f0d084';
    ctx.fillRect(o.x, o.y, 5, 5);
    ctx.fillRect(o.x + o.w - 5, o.y, 5, 5);
    ctx.fillRect(o.x, o.y + o.h - 5, 5, 5);
    ctx.fillRect(o.x + o.w - 5, o.y + o.h - 5, 5, 5);
    ctx.restore();
    return;
  }

  // Ornate Bronze Art-Deco Folding Screen ('screen')
  ctx.save();
  ctx.fillStyle = '#2d2317';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.strokeStyle = '#c9a252';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
  // Art-Deco geometric zigzag lattice panels
  ctx.strokeStyle = '#f0d084';
  ctx.lineWidth = 1.1;
  const panels = Math.max(3, Math.floor(o.h / 18));
  const ph = o.h / panels;
  for (let i = 0; i < panels; i++) {
    const py = o.y + i * ph;
    ctx.beginPath();
    ctx.moveTo(o.x + 3, py + ph * 0.5);
    ctx.lineTo(o.x + o.w / 2, py + 3);
    ctx.lineTo(o.x + o.w - 3, py + ph * 0.5);
    ctx.lineTo(o.x + o.w / 2, py + ph - 3);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawCameraCone(ctx, cam) {
  const poly = cam.visionPoly;
  if (!poly || poly.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  const gr = ctx.createRadialGradient(cam.x, cam.y, 4, cam.x, cam.y, cam.range);
  gr.addColorStop(0, cam.alerting ? 'rgba(225, 29, 72, 0.5)' : 'rgba(45, 212, 191, 0.42)');
  gr.addColorStop(0.65, cam.alerting ? 'rgba(225, 29, 72, 0.2)' : 'rgba(45, 212, 191, 0.16)');
  gr.addColorStop(1, 'rgba(45, 212, 191, 0.03)');
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = cam.alerting ? 'rgba(253, 164, 175, 0.85)' : 'rgba(94, 234, 212, 0.72)';
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

  const gr = ctx.createRadialGradient(g.x, g.y, 6, g.x, g.y, g.spec.visionRange);
  let stroke = '#62e3ff';
  if (g.state === 'BREACH') {
    gr.addColorStop(0, 'rgba(255, 58, 80, 0.60)');
    gr.addColorStop(0.62, 'rgba(240, 30, 62, 0.40)');
    gr.addColorStop(1, 'rgba(196, 18, 48, 0.20)');
    stroke = '#ff4d63';
  } else if (g.state === 'SWEEPING') {
    gr.addColorStop(0, 'rgba(251, 146, 60, 0.56)');
    gr.addColorStop(0.55, 'rgba(214, 120, 200, 0.36)');
    gr.addColorStop(1, 'rgba(147, 51, 234, 0.20)');
    stroke = '#fdba74';
  } else if (g.state === 'CURIOUS') {
    gr.addColorStop(0, 'rgba(255, 195, 50, 0.42)');
    gr.addColorStop(0.62, 'rgba(245, 158, 11, 0.24)');
    gr.addColorStop(1, 'rgba(202, 138, 4, 0.07)');
    stroke = '#ffd15c';
  } else {
    gr.addColorStop(0, 'rgba(64, 210, 255, 0.34)');
    gr.addColorStop(0.62, 'rgba(56, 189, 248, 0.19)');
    gr.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
    stroke = '#62e3ff';
  }
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = g.state === 'PATROL' ? 1.85 : g.state === 'CURIOUS' ? 2.2 : 2.8;
  ctx.stroke();
  ctx.restore();
}

function drawBrassVents(ctx, vents, state, nowSec) {
  if (!vents.length) return;
  const live = state.mode !== 'debrief';
  const open = live && state.player.ventInRange;
  ctx.save();
  // Subtle blueprint subterranean duct connector line between linked grates
  if (vents.length >= 2 && live) {
    ctx.beginPath();
    ctx.moveTo(vents[0].x, vents[0].y);
    ctx.lineTo(vents[1].x, vents[1].y);
    if (open) {
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)'; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.95)'; ctx.lineWidth = 2.8;
      ctx.setLineDash([11, 8]); ctx.lineDashOffset = -nowSec * 26;
    } else {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.16)'; ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 7]);
    }
    ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  for (const v of vents) {
    ctx.save();
    ctx.translate(v.x, v.y);
    if (open) {
      const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 50);
      glow.addColorStop(0, 'rgba(34, 211, 238, 0.66)');
      glow.addColorStop(0.5, 'rgba(34, 211, 238, 0.24)');
      glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
      const u = (nowSec * 0.8) % 1;
      ctx.strokeStyle = `rgba(165, 243, 252, ${0.85 - u * 0.6})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 21 + u * 15, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#121826';
    ctx.strokeStyle = open ? '#a5f3fc' : '#c9a252';
    ctx.lineWidth = open ? 2.6 : 1.6;
    ctx.fillRect(-13, -11, 26, 22);
    ctx.strokeRect(-13, -11, 26, 22);
    // Art-Deco slotted brass ventilation louvers
    ctx.strokeStyle = open ? '#ecfeff' : '#5eead4';
    ctx.lineWidth = 1.4;
    for (const sy of [-6, -2, 2, 6]) {
      ctx.beginPath(); ctx.moveTo(-9, sy); ctx.lineTo(9, sy); ctx.stroke();
    }
    if (live && !open) drawTag(ctx, 0, 19, 'VENT [V]', '#5eead4', 'rgba(9, 20, 28, 0.92)', '#2dd4bf', false);
    ctx.restore();
  }
  ctx.restore();
}

function drawTripwire(ctx, tw, nowSec) {
  ctx.save();
  if (tw.active) {
    const p = 0.78 + 0.22 * Math.sin(nowSec * 12);
    ctx.strokeStyle = `rgba(225, 29, 72, ${0.38 * p})`;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(tw.x1, tw.y1); ctx.lineTo(tw.x2, tw.y2); ctx.stroke();
    ctx.strokeStyle = `rgba(255, 228, 230, ${0.95 * p})`;
    ctx.lineWidth = 1.9;
    ctx.beginPath(); ctx.moveTo(tw.x1, tw.y1); ctx.lineTo(tw.x2, tw.y2); ctx.stroke();
  }
  for (const [ex, ey] of [[tw.x1, tw.y1], [tw.x2, tw.y2]]) {
    ctx.fillStyle = '#251f16';
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a252'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = tw.active ? '#fb7185' : '#64748b';
    ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawOpalAndRelics(ctx, state, nowSec) {
  // Gilded Museum Relics
  for (const r of state.relicItems) {
    if (r.taken) continue;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.fillStyle = '#2b2217';
    ctx.strokeStyle = '#c9a252';
    ctx.lineWidth = 1.3;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.fillStyle = '#f6d88a';
    ctx.beginPath();
    ctx.moveTo(0, -6.5); ctx.lineTo(5.5, 0); ctx.lineTo(0, 6.5); ctx.lineTo(-5.5, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // The Solis Opal — Iridescent Cyan-Gold Octagonal Pedestal Vitrine
  const O = state.wing.opal;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 3.8);
  ctx.save();
  ctx.translate(O.x, O.y);
  ctx.fillStyle = '#182132';
  ctx.strokeStyle = '#f6d88a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    i === 0 ? ctx.moveTo(Math.cos(a) * 21, Math.sin(a) * 21) : ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (!state.opalTaken) {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 38 + pulse * 6);
    glow.addColorStop(0, 'rgba(253, 224, 71, 0.62)');
    glow.addColorStop(0.48, 'rgba(56, 189, 248, 0.36)');
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();

    // Iridescent cyan-gold Solis Opal cabochon diamond
    const og = ctx.createLinearGradient(-10, -12, 10, 12);
    og.addColorStop(0, '#fef08a');
    og.addColorStop(0.48, '#38bdf8');
    og.addColorStop(1, '#f59e0b');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(10.5, 0); ctx.lineTo(0, 13); ctx.lineTo(-10.5, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fef9c3'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-2.5, -3.5, 2.6, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ddffff';
    ctx.beginPath(); ctx.moveTo(8, -18); ctx.lineTo(10, -11); ctx.lineTo(17, -9);
    ctx.lineTo(10, -7); ctx.lineTo(8, -1); ctx.lineTo(6, -7); ctx.lineTo(1, -9); ctx.lineTo(6, -11);
    ctx.closePath(); ctx.fill();
    drawTag(ctx, 0, -39, 'SOLIS OPAL', '#c9fbff', '#08232d', '#68e8ff', false, true);
  } else {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.78)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (state.mode !== 'debrief') drawTag(ctx, 0, 35, 'OPAL TAKEN', '#6ee7b7', 'rgba(11, 26, 22, 0.96)', '#34d399', false, true);
  }
  ctx.restore();
}

function drawBrassElevator(ctx, state, nowSec) {
  const el = state.wing.elevator;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 4.0);

  ctx.save();
  ctx.translate(el.x, el.y);
  if (state.opalTaken) {
    drawOpenElevator(ctx, el, nowSec);
    ctx.restore();
    return;
  }
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46 + pulse * 6);
  glow.addColorStop(0, 'rgba(201, 162, 82, 0.34)');
  glow.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#241c13';
  ctx.strokeStyle = '#e5be67';
  ctx.lineWidth = 2;
  ctx.fillRect(-21, -19, 42, 38);
  ctx.strokeRect(-21, -19, 42, 38);

  // Semicircular brass floor dial
  ctx.strokeStyle = '#f0d084';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, -6, 12, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-6, -15); ctx.stroke();

  // Closed vertical bars + clear brass padlock badge
  ctx.strokeStyle = 'rgba(201, 162, 82, 0.65)';
  ctx.lineWidth = 1.3;
  for (const bx of [-11, -4, 4, 11]) {
    ctx.beginPath(); ctx.moveTo(bx, -3); ctx.lineTo(bx, 16); ctx.stroke();
  }
  ctx.fillStyle = '#0d1018';
  ctx.strokeStyle = '#f6d88a';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 4, 4.5, Math.PI, 0); ctx.stroke();
  ctx.fillRect(-5.5, 4, 11, 8);
  ctx.strokeRect(-5.5, 4, 11, 8);
  drawTag(ctx, 0, 36, 'EXIT · LOCKED', '#ffe5a5', '#251c0d', '#e9bf65', false, true);
  ctx.restore();
}

function drawOpenElevator(ctx, el, nowSec) {
  const w = el.r + 11, h = 30;
  const spill = ctx.createRadialGradient(0, 0, 8, 0, 0, 112);
  spill.addColorStop(0, 'rgba(60, 255, 176, 0.80)');
  spill.addColorStop(0.36, 'rgba(22, 224, 142, 0.42)');
  spill.addColorStop(0.7, 'rgba(16, 185, 129, 0.14)');
  spill.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = spill;
  ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2); ctx.fill();
  for (const k of [0, 0.5]) {
    const u = (nowSec * 0.55 + k) % 1;
    ctx.strokeStyle = `rgba(110, 255, 196, ${0.62 * (1 - u)})`; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, w + 8 + u * 46, 0, Math.PI * 2); ctx.stroke();
  }

  // Luminous outer emerald frame when unlocked!
  ctx.shadowColor = '#34ffaa'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#063826'; ctx.strokeStyle = '#6dffbf'; ctx.lineWidth = 3.6;
  ctx.beginPath(); ctx.roundRect(-w, -h, w * 2, h * 2, 5); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Open gilded elevator doors
  const car = ctx.createLinearGradient(0, -h, 0, h);
  car.addColorStop(0, '#d5ffec'); car.addColorStop(0.5, '#4dedaa'); car.addColorStop(1, '#0f9d68');
  ctx.fillStyle = car;
  ctx.fillRect(-w + 15, -h + 7, w * 2 - 30, h * 2 - 13);
  ctx.fillStyle = '#0a5238'; ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 1.4;
  for (const dx of [-w + 5, w - 14]) {
    ctx.fillRect(dx, -h + 7, 9, h * 2 - 13); ctx.strokeRect(dx, -h + 7, 9, h * 2 - 13);
  }
  ctx.strokeStyle = '#064e36'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const cy of [-5, 9]) {
    ctx.beginPath(); ctx.moveTo(-11, cy + 6); ctx.lineTo(0, cy - 4); ctx.lineTo(11, cy + 6); ctx.stroke();
  }
  const marquee = el.y - h - 32 >= 20 ? -h - 17 : h + 17;
  drawTag(ctx, 0, marquee, 'EXIT · OPEN', '#eafff5', '#05402b', '#6dffbf', false, true, 0, '#34ffaa');
}

const veilHolds = (sm, p) => sm.alpha > 0.22 && Math.hypot(p.x - sm.x, p.y - sm.y) <= sm.r * 0.92;

function drawVelvetVeil(ctx, sm, nowSec, hiding) {
  const { x, y } = sm, rim = sm.r * 0.9, a = Math.min(1, sm.alpha / 0.9);
  ctx.save();
  const haze = ctx.createRadialGradient(x, y, sm.r * 0.12, x, y, sm.r);
  haze.addColorStop(0, `rgba(99, 76, 233, ${0.18 * a})`);
  haze.addColorStop(0.7, `rgba(124, 77, 255, ${0.32 * a})`);
  haze.addColorStop(0.9, `rgba(168, 120, 255, ${0.38 * a})`);
  haze.addColorStop(1, 'rgba(88, 40, 190, 0)');
  ctx.fillStyle = haze;
  ctx.beginPath(); ctx.arc(x, y, sm.r, 0, Math.PI * 2); ctx.fill();

  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const rr = rim * (0.36 + k * 0.2), spin = nowSec * (k % 2 ? -0.7 : 0.55) + k * 2.2;
    ctx.strokeStyle = `rgba(221, 214, 254, ${(0.56 - k * 0.1) * a})`;
    ctx.lineWidth = 2.6 - k * 0.5;
    ctx.beginPath(); ctx.arc(x, y, rr, spin, spin + 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, rr, spin + Math.PI, spin + Math.PI + 1.15); ctx.stroke();
  }

  // Silver-violet mist outline, dashed where sightlines break
  ctx.lineCap = 'butt';
  ctx.strokeStyle = `rgba(167, 139, 250, ${0.36 * a})`; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(x, y, rim, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(237, 233, 254, ${0.98 * a})`; ctx.lineWidth = 2.6;
  ctx.setLineDash([9, 6]); ctx.lineDashOffset = -nowSec * 14;
  ctx.stroke();
  ctx.restore();
  if (!hiding) drawTag(ctx, x, y - sm.r - 8, 'VELVET VEIL', '#e9d5ff', 'rgba(26, 15, 48, 0.9)', '#b794f4');
}

function drawTacticalOverlays(ctx, state, nowSec) {
  if (state.lastCoinArc && state.lastCoinArc.alpha > 0.05) {
    const a = state.lastCoinArc;
    ctx.save();
    ctx.strokeStyle = `rgba(240, 208, 132, ${a.alpha})`;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.quadraticCurveTo((a.sx + a.tx) / 2, Math.min(a.sy, a.ty) - 42, a.tx, a.ty);
    ctx.stroke();
    ctx.restore();
  }

  for (const g of state.guards) {
    if (g.state === 'CURIOUS' && g.lurePos) {
      ctx.save();
      ctx.strokeStyle = 'rgba(39, 22, 7, 0.76)'; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.lurePos.x, g.lurePos.y); ctx.stroke();
      ctx.strokeStyle = '#ffd071'; ctx.setLineDash([8, 5]); ctx.lineWidth = 2.6; ctx.stroke();
      ctx.restore();
    }
  }

  for (const rp of state.ripples) {
    ctx.save();
    const isCoin = rp.kind === 'coin';
    ctx.strokeStyle = isCoin ? `rgba(240, 208, 132, ${rp.alpha})` : `rgba(56, 189, 248, ${rp.alpha * 0.72})`;
    ctx.lineWidth = isCoin ? 2 : 1.3;
    ctx.setLineDash(isCoin ? [] : [4, 5]);
    ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (isCoin) {
      ctx.fillStyle = '#ffd16c'; ctx.strokeStyle = '#43290e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff5c9'; ctx.fillRect(rp.x - 2, rp.y - 3, 2, 5);
    }
    ctx.restore();
  }
  for (const rp of state.ripples) {
    if (rp.kind !== 'coin' || !rp.label) continue;
    const g = state.guards.find(g => g.state === 'CURIOUS' && g.lurePos?.x === rp.x && g.lurePos.y === rp.y);
    if (g) {
      drawTag(ctx, rp.x, rp.y, `CLINK! · ${g.type.toUpperCase()} LURED`, '#fff2c4', '#392608', '#ffc75b', true, true, g.x < rp.x ? 1 : -1);
    } else drawTag(ctx, rp.x, rp.y - 20, rp.label, '#ffe7a2', '#231907', '#e5be67');
  }

  if (state.bellOrigin) {
    const { x, y } = state.bellOrigin;
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const r = 34 + k * 42 + ((nowSec * 34) % 20);
      ctx.strokeStyle = k % 2 === 0 ? `rgba(225, 29, 72, ${0.65 - k * 0.16})` : `rgba(240, 208, 132, ${0.52 - k * 0.12})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.78)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.6;
    for (const ln of state.bellLinks || []) {
      ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(ln.x2, ln.y2); ctx.stroke();
    }
    ctx.restore();
    drawTag(ctx, x, y - 34, 'CURFEW BELL!', '#ffe4e6', 'rgba(76, 10, 24, 0.95)', '#fb7185');
  }

  if (state.lastGlimpse) {
    const lg = state.lastGlimpse;
    ctx.save();
    ctx.translate(lg.x, lg.y);
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
    halo.addColorStop(0, 'rgba(125, 211, 252, 0.40)');
    halo.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.96)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(lg.angle || 0);
    ctx.scale(1.25, 1.25);
    ctx.setLineDash([3, 2.4]);
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
    traceTrenchCoat(ctx);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-1.5, 0, 7.6, 8.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    drawTag(ctx, lg.x, lg.y + 38, 'LAST SEEN', '#e0f2fe', 'rgba(13, 24, 42, 0.94)', '#7dd3fc');
  }
}

function drawGoldenTrail(ctx, { points, pins }) {
  ctx.save();
  const ink = ctx.createLinearGradient(0, STAGE_H, STAGE_W, 0);
  for (const [at, color] of [[0,'#79ffed'],[.38,'#91fff2'],[.56,'#ffdf83'],[.73,'#a0ffeb'],[1,'#80ffcf']]) ink.addColorStop(at, color);
  ctx.lineJoin = 'round';
  const walk = new Path2D(), duct = new Path2D();
  points.forEach((p, i) => {
    if (p.vent) { duct.moveTo(points[i-1].x, points[i-1].y); duct.lineTo(p.x, p.y); }
    if (!i || p.vent) walk.moveTo(p.x, p.y); else walk.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = '#6dd8ef'; ctx.lineWidth = 3; ctx.setLineDash([3,7]); ctx.stroke(duct);
  ctx.setLineDash([]);
  ctx.strokeStyle = '#083535'; ctx.lineWidth = 10; ctx.shadowColor = '#36e7ce'; ctx.shadowBlur = 12; ctx.stroke(walk);
  ctx.shadowBlur = 0; ctx.strokeStyle = ink; ctx.lineWidth = 5.5; ctx.setLineDash([15,7]); ctx.stroke(walk);
  ctx.setLineDash([]);
  for (const { x,y,label,sx,sy } of pins) {
    if (label === 'DOUSED LAMP') continue; // Unlit sconces already mark their own sites.
    const entry = label === 'ENTRY', opal = label === 'OPAL', gem = opal || label === 'RELIC';
    if (gem) {
      ctx.strokeStyle = '#e8dfb7'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke();
    }
    const r = opal ? 15 : 10;
    ctx.beginPath();
    if (gem) { ctx.moveTo(x,y-r); ctx.lineTo(x+r,y); ctx.lineTo(x,y+r); ctx.lineTo(x-r,y); ctx.closePath(); }
    else ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = entry ? '#73ffdf' : '#ffdc7f'; ctx.fill();
    ctx.strokeStyle = '#102022'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, opal ? 5 : 3, 0, Math.PI * 2); ctx.fillStyle = '#174446'; ctx.fill();
    if (entry || opal) drawTag(ctx, x, y + (entry ? -29 : 36), entry ? 'ENTRY' : 'OPAL LIFTED', '#e0fff7', '#093730', '#8bffdb', true, true);
  }
  ctx.restore();
}

function drawCameraDome(ctx, cam) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.fillStyle = '#1d1710';
  ctx.strokeStyle = '#e5be67';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = cam.alerting ? '#fb7185' : '#2dd4bf';
  ctx.beginPath(); ctx.arc(Math.cos(cam.angle) * 3, Math.sin(cam.angle) * 3, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function traceTrenchCoat(ctx) {
  ctx.beginPath();
  ctx.moveTo(4, -12.5); ctx.lineTo(-9, -10.5); ctx.lineTo(-11, 0); ctx.lineTo(-9, 10.5); ctx.lineTo(4, 12.5);
  ctx.quadraticCurveTo(9, 0, 4, -12.5);
  ctx.closePath();
}

function drawInfiltrator(ctx, state) {
  const p = state.player;
  const concealed = p.inVeil || (p.inSettee && p.crouched);
  const shadowed = !concealed && (p.inShadow || p.inDoused || p.inAlcove);
  ctx.save();
  ctx.translate(p.x, p.y);

  // Distinct aura: bright emerald ONLY when genuinely concealed; soft cyan in ordinary shadow
  if (concealed) {
    const aura = ctx.createRadialGradient(0, 0, p.r * 0.5, 0, 0, p.r + 19);
    aura.addColorStop(0, 'rgba(52, 211, 153, 0.44)');
    aura.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, p.r + 19, 0, Math.PI * 2); ctx.fill();
  } else if (shadowed) {
    const aura = ctx.createRadialGradient(0, 0, p.r * 0.6, 0, 0, p.r + 13);
    aura.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
    aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, p.r + 13, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = concealed ? '#5ff5bd' : shadowed ? '#38bdf8' : '#f6d88a';
  ctx.lineWidth = concealed ? 3 : 2.0;
  if (shadowed) ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.arc(0, 0, p.r + 7, 0, Math.PI * 2);
  if (concealed) { ctx.fillStyle = 'rgba(2, 20, 16, 0.78)'; ctx.fill(); }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(p.angle);
  ctx.fillStyle = concealed ? '#082423' : '#101d33';
  ctx.strokeStyle = concealed ? '#a7f3d0' : '#f6efe2';
  ctx.lineWidth = 2.1;
  traceTrenchCoat(ctx);
  ctx.fill(); ctx.stroke();

  // Wide-brimmed fedora crown & emerald/gold ribbon band
  ctx.fillStyle = '#0d1424';
  ctx.strokeStyle = concealed ? '#34d399' : state.opalTaken ? '#fef08a' : '#7dd3fc';
  ctx.lineWidth = 1.9;
  ctx.beginPath(); ctx.ellipse(-1.5, 0, 7.6, 8.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Bright directional ivory/emerald lapel chevron
  ctx.fillStyle = state.opalTaken ? '#fef08a' : concealed ? '#6ee7b7' : '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(11.5, 0); ctx.lineTo(2.5, -5.5); ctx.lineTo(4.8, 0); ctx.lineTo(2.5, 5.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  const veiled = p.inVeil && state.veilsActive.find((sm) => veilHolds(sm, p));
  if (veiled) {
    const out = Math.abs(p.x - veiled.x) > 6 ? Math.sign(p.x - veiled.x) : 1;
    drawTag(ctx, p.x, p.y, 'VEIL · CONCEALED', '#06291e', '#8cf5cd', '#f3e8ff', true, 'pill', out, '#a78bfa');
  } else if (concealed || (p.inDoused && state.detectionState !== 'BREACH')) {
    const lamp = !concealed && state.lights.find((l) => !l.lit && Math.hypot(p.x - l.x, p.y - l.y) < l.r * 0.74);
    const side = p.y >= STAGE_H - 64 || (lamp && lamp.y > p.y) ? -1 : 1;
    ctx.fillStyle = concealed ? '#b3ffdd' : '#bae6fd';
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 21 * side);
    ctx.lineTo(p.x - 5, p.y + 31 * side); ctx.lineTo(p.x + 5, p.y + 31 * side); ctx.closePath(); ctx.fill();
    if (concealed) drawTag(ctx, p.x, p.y + 42 * side, 'YOU · HIDDEN', '#06291e', '#78ecc0', '#c1ffe1', true, 'pill');
    else drawTag(ctx, p.x, p.y + 42 * side, 'DEEP SHADOW', '#04202f', '#7dd3fc', '#e0f2fe', true, 'pill');
  } else if (shadowed && state.detectionState !== 'BREACH') {
    drawTag(ctx, p.x, p.y + 25, 'SHADOW', '#7dd3fc', 'rgba(9, 20, 34, 0.94)', '#38bdf8', true, false);
  }

  if (state.mode === 'play' && !state.shotMode && p.lampInRange) {
    drawTag(ctx, p.x, p.y - 29, 'R · DOUSE LAMP', '#f6d88a', 'rgba(9, 13, 22, 0.96)', '#c9a252');
  } else if (state.mode === 'play' && p.inSettee && !p.crouched) {
    drawTag(ctx, p.x, p.y - 29, 'SHIFT · CROUCH IN COVER', '#a7f3d0', '#081614', '#34d399');
  }
}

function drawGuard(ctx, g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath(); ctx.arc(2, 4, g.r + 1, 0, Math.PI * 2); ctx.fill();

  const fill = g.state === 'BREACH' ? '#e11d48' : g.state === 'SWEEPING' ? '#d97706' : g.spec.cloak;
  ctx.fillStyle = fill;
  ctx.strokeStyle = g.spec.trim;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, g.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Facing brass lantern & directional pointer
  ctx.rotate(g.angle);
  ctx.fillStyle = '#0d1018';
  ctx.beginPath();
  ctx.moveTo(6.5, 0); ctx.lineTo(-4.2, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4.2, 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath(); ctx.arc(9.5, 4.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (g.state === 'CURIOUS' && g.lurePos) {
    ctx.save();
    const a = Math.atan2(g.lurePos.y - g.y, g.lurePos.x - g.x);
    ctx.strokeStyle = '#ffd071'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(g.x, g.y, 17, a - 1, a + 1); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.x, g.y, 22, a - 0.55, a + 0.55); ctx.stroke();
    ctx.fillStyle = '#ffcf68'; ctx.strokeStyle = '#3e280e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y - 25, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#271a0b'; ctx.font = 'bold 21px Georgia, serif'; ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; ctx.fillText('?', g.x, g.y - 24);
    ctx.restore();
  } else if (g.pauseLeft > 0 && g.state === 'PATROL') {
    const pts = g.waypoints, total = pts[(g.wpIndex + pts.length - 1) % pts.length].pause;
    ctx.strokeStyle = '#f1cf87'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, 16, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * g.pauseLeft / total); ctx.stroke();
  }
}

function drawGuardBarks(ctx, state) {
  const { guards, player, wing, detectionState } = state;
  for (const p of [player, wing.opal, wing.elevator, ...guards]) {
    const r = p === wing.elevator ? 43 : 22;
    labelBounds.push([p.x-r, p.y-(p.lurePos ? 40 : r), p.x+r, p.y+r]);
  }
  const top = state.ribbonTimer > 0 || detectionState === 'BREACH' || (detectionState === 'SWEEPING' && state.time - state.lastVentAt < 6) ? 66 : 18;
  ctx.save();
  ctx.font = 'italic bold 23px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const g of guards) {
    if (g.state === 'PATROL') continue;
    const text = g.state === 'CURIOUS' ? 'What was that?' : g.state === 'BREACH' ? (g.id % 2 ? 'Flanking!' : 'Intruder!') :
      detectionState === 'BREACH' ? 'Cut them off!' : state.wingAlerts && g.id % 2 ? 'Lost sight!' : 'Check the hall!';
    const w = Math.ceil(ctx.measureText(text).width) + 23, h = 31;
    const outward = g.x < (g.target?.x ?? g.x) ? -1 : 1;
    let spot;
    for (const side of [outward, -outward]) {
      for (const [offset, dy] of [[29,-52],[50,-52],[29,-80],[50,-80],[20,-102],[29,24],[50,24],[29,56]]) {
        const x = Math.max(25, Math.min(STAGE_W - w - 25, g.x + (side > 0 ? offset : -offset-w)));
        const y = g.y + dy;
        if ((side > 0 ? x < g.x+6 : x+w > g.x-6) || y < top || y+h > STAGE_H-17 ||
            labelBounds.some(([l,t,r,b]) => x < r+5 && x+w > l-5 && y < b+5 && y+h > t-5)) continue;
        const cover = wing.obstacles.some(o => x < o.x+o.w+2 && x+w > o.x-2 && y < o.y+o.h+2 && y+h > o.y-2);
        if (!spot || !cover) spot = { x,y,dy,side,cover };
        if (!cover) break;
      }
      if (spot && !spot.cover) break;
    }
    if (!spot) continue;
    const { x, y, dy, side } = spot;
    const tail = side > 0 ? 13 : w - 30, endY = dy < 0 ? h : 2;
    const dx = g.x + side * 14 - x - tail - 7, dyTip = g.y + Math.sign(dy) * 7 - y - endY;
    const u = Math.min(1, 34 / Math.hypot(dx, dyTip));
    const tx = tail + 7 + u * dx, ty = endY + u * dyTip;
    ctx.save(); ctx.translate(x, y);
    if (u < 1) {
      ctx.strokeStyle = '#dcc79c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tail + 7 + dx, endY + dyTip); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(5, 3);
    if (dy > 0) { ctx.lineTo(tail, 2); ctx.lineTo(tx, ty); ctx.lineTo(tail + 14, 2); }
    ctx.lineTo(w, 0); ctx.lineTo(w - 3, h - 2);
    if (dy < 0) { ctx.lineTo(tail + 14, h); ctx.lineTo(tx, ty); ctx.lineTo(tail, h); }
    ctx.lineTo(0, h + 1); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#232329'; ctx.stroke();
    ctx.fillStyle = '#faf3e0'; ctx.fill();
    ctx.translate(w / 2, h / 2 + 1); ctx.rotate(-0.025); ctx.fillStyle = '#26242a'; ctx.fillText(text, 0, 0);
    ctx.restore();
    labelBounds.push([x, y, x+w, y+h]);
  }
  ctx.restore();
}

function drawAimArc(ctx, state) {
  const p = state.player;
  const maxD = 235 * state.mods.throwRangeMult;
  let dx = state.aim.x - p.x, dy = state.aim.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 22) return;
  if (d > maxD) { dx = (dx / d) * maxD; dy = (dy / d) * maxD; }
  const tx = p.x + dx, ty = p.y + dy;
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 208, 132, 0.55)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo((p.x + tx) / 2, (p.y + ty) / 2 - 26, tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawTag(ctx, x, y, text, fg, bg, border, clamp = true, hero = false, dock = 0, glow = null) {
  ctx.save();
  ctx.font = hero ? 'bold 16px "DejaVu Sans Condensed", sans-serif' : '800 10px ui-monospace, SFMono-Regular, monospace';
  const h = hero ? 27 : 17;
  const tw = Math.ceil(ctx.measureText(text).width) + (hero ? 22 : 12);
  let bx = x - tw / 2, by = y - h / 2;
  if (dock) {
    const edge = x + dock * 20;
    const left = dock < 0 ? edge - tw : edge;
    if (left >= 18 && left + tw <= STAGE_W - 18) {
      bx = left; ctx.strokeStyle = border; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + dock * 8, y); ctx.lineTo(edge, y); ctx.stroke();
    } else by += y > 64 ? -38 : 38;
  }
  if (clamp) {
    bx = Math.max(18, Math.min(STAGE_W - tw - 18, bx));
    by = Math.max(18, Math.min(STAGE_H - h - 6, by));
  }
  if (labelBounds) {
    const { e, f } = ctx.getTransform();
    labelBounds.push([bx+e, by+f, bx+tw+e, by+h+f]);
  }
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  } else if (hero) {
    ctx.shadowColor = '#030911';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(bx + 0.5, by + 0.5, tw - 1, h - 1, hero ? (hero === 'pill' ? h / 2 : 4) : 0);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = border || fg;
  ctx.lineWidth = hero ? 1.8 : 1.15;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, by + h / 2 + 0.5);
  ctx.restore();
}
