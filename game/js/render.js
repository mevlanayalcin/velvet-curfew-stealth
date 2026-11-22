// Velvet Curfew — Art-Deco 2.5D Museum Renderer, Dynamic Lamp Pools, Raycast Cones & Footstep Sonar

import { STAGE_H, STAGE_W } from './levels.js';

const floorCache = new Map();
let shadowHatch;

export function renderMuseumStage(ctx, state, nowSec) {
  const w = state.wing;
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);
  ctx.drawImage(getMuseumFloor(w), 0, 0);
  for (const a of w.alcoves || []) drawShadowAlcove(ctx, a);
  drawDynamicLampPools(ctx, state, nowSec);
  drawBrassVents(ctx, w.vents || [], state);
  for (const ar of w.arches || []) drawArtDecoArch(ctx, ar);
  if (state.mode !== 'debrief') drawCoverBlindSpots(ctx, state);
  for (const o of w.obstacles) if (o.kind === 'settee') drawVelvetSettee(ctx, o);
  if (state.mode !== 'debrief') drawPatrolTracks(ctx, state.guards);
  drawRaycastCones(ctx, state);
  for (const tw of state.tripwires) drawTripwire(ctx, tw, nowSec);
  for (const o of w.obstacles) if (o.kind !== 'settee') drawTallMuseumProp(ctx, o);
  drawSconceFixtures(ctx, state);
  drawOpalAndRelics(ctx, state, nowSec);
  drawBrassElevator(ctx, state, nowSec);
  for (const sm of state.veilsActive) drawVelvetVeil(ctx, sm, nowSec);
  drawTacticalOverlays(ctx, state, nowSec);
  if (state.mode === 'debrief' && state.debriefTrail) drawGoldenTrail(ctx, state.debriefTrail);
  if (state.mode === 'play' && !state.shotMode && state.aim.active && state.coins > 0) drawAimArc(ctx, state);
  for (const c of state.coinsInFlight) {
    const u = Math.min(1, c.t / c.dur);
    const x = c.sx + (c.tx - c.sx) * u, y = c.sy + (c.ty - c.sy) * u - Math.sin(u * Math.PI) * 34;
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(x, y, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (const cam of state.cameras) drawCameraDome(ctx, cam);
  drawGuardFootstepSonar(ctx, state.guardSteps || []);
  if (state.mode !== 'debrief') drawInfiltrator(ctx, state);
  for (const g of state.guards) drawGuard(ctx, g);
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawDynamicLampPools(ctx, state, nowSec) {
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

export function drawGuardFootstepSonar(ctx, steps) {
  if (!steps.length) return;
  ctx.save();
  for (const s of steps) {
    const col = s.danger ? `rgba(255, 209, 92, ${s.alpha})` : `rgba(226, 232, 240, ${s.alpha})`;
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(4, s.r * 0.56), 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (s.label) {
      drawTag(ctx, s.x, s.y + s.r + 10, s.label, s.danger ? '#fef08a' : '#e2e8f0', 'rgba(10, 14, 24, 0.9)', s.danger ? '#f59e0b' : '#94a3b8');
    }
  }
  ctx.restore();
}

export function drawRaycastCones(ctx, state) {
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
    }
  }
  ctx.restore();
}

// Pre-render diagonal chevron marble parquet, crimson velvet runners with brass filigree & octagonal rotunda medallion
function getMuseumFloor(wing) {
  if (floorCache.has(wing.id)) return floorCache.get(wing.id);
  const off = document.createElement('canvas');
  off.width = STAGE_W;
  off.height = STAGE_H;
  const g = off.getContext('2d');

  // Deep midnight chiaroscuro obsidian-navy floor so warm golden lamp pools vs dark shadows pop at thumbnail scale!
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
  for (const l of state.lights) {
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
      if (state.mode !== 'debrief') {
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
    gr.addColorStop(0, 'rgba(255, 65, 85, 0.44)');
    gr.addColorStop(0.62, 'rgba(235, 35, 65, 0.26)');
    gr.addColorStop(1, 'rgba(180, 18, 45, 0.08)');
    stroke = '#ff5568';
  } else if (g.state === 'SWEEPING') {
    gr.addColorStop(0, 'rgba(251, 146, 60, 0.44)');
    gr.addColorStop(0.62, 'rgba(192, 132, 252, 0.24)');
    gr.addColorStop(1, 'rgba(126, 34, 206, 0.06)');
    stroke = '#fdba74';
  } else if (g.state === 'CURIOUS') {
    gr.addColorStop(0, 'rgba(255, 195, 50, 0.42)');
    gr.addColorStop(0.62, 'rgba(245, 158, 11, 0.24)');
    gr.addColorStop(1, 'rgba(202, 138, 4, 0.07)');
    stroke = '#ffd15c';
  } else {
    // High-contrast luminous moonlight-ice cyan raycast cone popping vividly against dark marble & velvet!
    gr.addColorStop(0, 'rgba(64, 210, 255, 0.34)');
    gr.addColorStop(0.62, 'rgba(56, 189, 248, 0.19)');
    gr.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
    stroke = '#62e3ff';
  }
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = g.state === 'PATROL' ? 1.85 : 2.2;
  ctx.stroke();
  ctx.restore();
}

function drawBrassVents(ctx, vents, state) {
  if (!vents.length) return;
  ctx.save();
  // Subtle blueprint subterranean duct connector line between linked grates
  if (vents.length >= 2 && state.mode !== 'debrief') {
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.16)';
    ctx.setLineDash([4, 7]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(vents[0].x, vents[0].y);
    ctx.lineTo(vents[1].x, vents[1].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const v of vents) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.fillStyle = '#121826';
    ctx.strokeStyle = '#c9a252';
    ctx.lineWidth = 1.6;
    ctx.fillRect(-13, -11, 26, 22);
    ctx.strokeRect(-13, -11, 26, 22);
    // Art-Deco slotted brass ventilation louvers
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 1.4;
    for (const sy of [-6, -2, 2, 6]) {
      ctx.beginPath(); ctx.moveTo(-9, sy); ctx.lineTo(9, sy); ctx.stroke();
    }
    if (state.mode !== 'debrief') {
      drawTag(ctx, 0, 19, 'VENT [V]', '#5eead4', 'rgba(9, 20, 28, 0.92)', '#2dd4bf', false);
    }
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
    drawTag(ctx, 0, 35, 'OPAL TAKEN', '#6ee7b7', 'rgba(11, 26, 22, 0.96)', '#34d399', false, true);
  }
  ctx.restore();
}

function drawBrassElevator(ctx, state, nowSec) {
  const el = state.wing.elevator;
  const open = state.opalTaken;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 4.0);

  ctx.save();
  ctx.translate(el.x, el.y);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46 + pulse * 6);
  glow.addColorStop(0, open ? 'rgba(52, 211, 153, 0.72)' : 'rgba(201, 162, 82, 0.34)');
  glow.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fill();

  if (open) {
    // Luminous outer emerald frame when unlocked!
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-26, -24, 52, 48);
  }

  ctx.fillStyle = open ? '#0e3628' : '#241c13';
  ctx.strokeStyle = open ? '#4ade80' : '#e5be67';
  ctx.lineWidth = open ? 2.6 : 2;
  ctx.fillRect(-21, -19, 42, 38);
  ctx.strokeRect(-21, -19, 42, 38);

  // Semicircular brass floor dial
  ctx.strokeStyle = open ? '#86efac' : '#f0d084';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, -6, 12, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(open ? 7 : -6, -15); ctx.stroke();

  if (open) {
    // Open gilded elevator doors
    ctx.strokeStyle = 'rgba(134, 239, 172, 0.8)';
    ctx.lineWidth = 1.6;
    for (const bx of [-15, -11, 11, 15]) {
      ctx.beginPath(); ctx.moveTo(bx, -3); ctx.lineTo(bx, 16); ctx.stroke();
    }
    drawTag(ctx, 0, 34, 'EXIT · OPEN', '#6ee7b7', 'rgba(8, 30, 22, 0.97)', '#34d399', false, true);
  } else {
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
  }
  ctx.restore();
}

function drawVelvetVeil(ctx, sm, nowSec) {
  ctx.save();
  ctx.globalAlpha = sm.alpha;
  const lobes = [
    { ox: 0, oy: 0, s: 1.0 },
    { ox: Math.cos(nowSec * 0.9) * 16, oy: Math.sin(nowSec * 0.8) * 11, s: 0.76 },
    { ox: -16, oy: 9, s: 0.7 },
    { ox: 15, oy: -10, s: 0.68 },
  ];
  for (const lb of lobes) {
    const r = sm.r * lb.s;
    const gr = ctx.createRadialGradient(sm.x + lb.ox, sm.y + lb.oy, 4, sm.x + lb.ox, sm.y + lb.oy, r);
    gr.addColorStop(0, 'rgba(167, 139, 250, 0.85)');
    gr.addColorStop(0.45, 'rgba(91, 52, 148, 0.76)');
    gr.addColorStop(0.8, 'rgba(42, 24, 78, 0.52)');
    gr.addColorStop(1, 'rgba(22, 14, 46, 0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(sm.x + lb.ox, sm.y + lb.oy, r, 0, Math.PI * 2); ctx.fill();
  }
  // Silver-violet mist outline + tiny silver flecks
  ctx.strokeStyle = 'rgba(221, 214, 254, 0.52)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.r * 0.88, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  drawTag(ctx, sm.x, sm.y - sm.r * 0.65, 'VELVET VEIL', '#e9d5ff', 'rgba(26, 15, 48, 0.9)', '#b794f4');
  ctx.restore();
}

function drawTacticalOverlays(ctx, state, nowSec) {
  // 1. Golden Parabolic Coin Toss Arc + Dashed Curiosity Line + Concentric Ripples + CLINK!
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

  // 2. Curfew Bell Red-Gold Alarm Pulses & Converging Vectors
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

  // 3. Ghost Silhouette Marker at LAST GLIMPSE
  if (state.lastGlimpse) {
    const lg = state.lastGlimpse;
    ctx.save();
    ctx.translate(lg.x, lg.y);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(lg.angle || 0);
    ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-1, 0); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    drawTag(ctx, lg.x, lg.y + 24, 'LAST GLIMPSE', '#bae6fd', 'rgba(13, 24, 42, 0.94)', '#38bdf8');
  }
}

function drawGoldenTrail(ctx, trailObj) {
  const pts = trailObj.points;
  if (!pts || pts.length < 2) return;
  ctx.save();
  // Soft warm glow under trail
  ctx.strokeStyle = 'rgba(240, 208, 132, 0.28)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // Crisp dashed gold infiltration route
  ctx.strokeStyle = '#f0d084';
  ctx.setLineDash([9, 6]);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);

  // Brass milestone pins along the infiltration route
  for (const pin of trailObj.pins || []) {
    ctx.fillStyle = '#0d1018';
    ctx.strokeStyle = pin.color || '#f0d084';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pin.x, pin.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pin.color || '#f0d084';
    ctx.beginPath(); ctx.arc(pin.x, pin.y, 2.5, 0, Math.PI * 2); ctx.fill();
    drawTag(ctx, pin.x, pin.y + (pin.dy ?? -20), pin.label, pin.color || '#f0d084', 'rgba(13, 16, 24, 0.94)', pin.color || '#c9a252');
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

  ctx.strokeStyle = concealed ? '#34d399' : shadowed ? '#38bdf8' : '#f6d88a';
  ctx.lineWidth = concealed ? 2.8 : 2.0;
  if (concealed || shadowed) ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.arc(0, 0, p.r + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Distinct Art-Deco Noir Infiltrator: tailored trench shoulders + wide-brimmed fedora + emerald/ivory scarf collar
  ctx.rotate(p.angle);
  ctx.fillStyle = concealed ? '#082423' : '#101d33';
  ctx.strokeStyle = concealed ? '#a7f3d0' : '#f6efe2';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(4, -12.5); ctx.lineTo(-9, -10.5); ctx.lineTo(-11, 0); ctx.lineTo(-9, 10.5); ctx.lineTo(4, 12.5);
  ctx.quadraticCurveTo(9, 0, 4, -12.5);
  ctx.closePath();
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

  if (concealed && state.detectionState !== 'BREACH') {
    const lbl = p.inVeil ? 'VELVET VEIL' : 'YOU · HIDDEN';
    const side = p.y < STAGE_H - 64 ? 1 : -1;
    ctx.fillStyle = '#b3ffdd';
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 21 * side);
    ctx.lineTo(p.x - 5, p.y + 31 * side); ctx.lineTo(p.x + 5, p.y + 31 * side); ctx.closePath(); ctx.fill();
    drawTag(ctx, p.x, p.y + 42 * side, lbl, '#06291e', '#78ecc0', '#c1ffe1', true, true);
  } else if (shadowed && state.detectionState !== 'BREACH') {
    const lbl = p.inDoused ? 'DEEP SHADOW' : 'SHADOW';
    drawTag(ctx, p.x, p.y + 25, lbl, '#7dd3fc', 'rgba(9, 20, 34, 0.94)', '#38bdf8', true, false);
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
  } else if (g.callout) {
    const isBreach = g.state === 'BREACH';
    drawTag(
      ctx, g.x, g.y - 24, g.callout,
      isBreach ? '#ffe4e6' : '#fef08a',
      isBreach ? 'rgba(84, 12, 28, 0.95)' : 'rgba(34, 24, 8, 0.94)',
      isBreach ? '#fb7185' : '#f59e0b'
    );
  }
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

function drawTag(ctx, x, y, text, fg, bg, border, clamp = true, hero = false, dock = 0) {
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
  if (hero) {
    ctx.shadowColor = '#030911';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(bx + 0.5, by + 0.5, tw - 1, h - 1, hero ? (text === 'YOU · HIDDEN' ? h / 2 : 4) : 0);
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
