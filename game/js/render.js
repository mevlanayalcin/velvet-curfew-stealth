// Velvet Curfew v2b — 100% Original 1920s Art-Deco Grand Museum Renderer (820x576)

import { STAGE_H, STAGE_W } from './levels.js';

const floorCache = new Map();

// Pre-render diagonal chevron marble parquet, crimson velvet runners with brass filigree & octagonal rotunda medallion
function getMuseumFloor(wing) {
  if (floorCache.has(wing.id)) return floorCache.get(wing.id);
  const off = document.createElement('canvas');
  off.width = STAGE_W;
  off.height = STAGE_H;
  const g = off.getContext('2d');

  // Slate-obsidian marble base (#141926 / #1b2233 chevron parquet)
  g.fillStyle = '#141926';
  g.fillRect(0, 0, STAGE_W, STAGE_H);

  const step = 34;
  for (let y = -step; y < STAGE_H + step; y += step) {
    for (let x = -step; x < STAGE_W + step; x += step) {
      const alt = ((Math.floor(x / step) + Math.floor(y / step)) & 1) === 0;
      g.fillStyle = alt ? '#1b2233' : '#141926';
      g.beginPath();
      g.moveTo(x + step / 2, y);
      g.lineTo(x + step, y + step / 2);
      g.lineTo(x + step / 2, y + step);
      g.lineTo(x, y + step / 2);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(201, 162, 82, 0.065)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }

  // Subtle perimeter gilded Art-Deco floor border
  g.strokeStyle = 'rgba(201, 162, 82, 0.24)';
  g.lineWidth = 1.2;
  g.strokeRect(24, 24, STAGE_W - 48, STAGE_H - 48);
  g.strokeRect(30, 30, STAGE_W - 60, STAGE_H - 60);

  // Crimson velvet carpet runners (#5c1625) with double brass Art-Deco corner filigree
  for (const c of wing.carpets || []) {
    const grad = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    grad.addColorStop(0, '#4f1220');
    grad.addColorStop(0.5, '#68192b');
    grad.addColorStop(1, '#48101d');
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

export function renderStage(ctx, state, nowSec) {
  const w = state.wing;
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);

  // 1. Cached Art-Deco Chevron Marble & Crimson Velvet Floor
  ctx.drawImage(getMuseumFloor(w), 0, 0);

  // 2. Velvet Stanchion Rope Shadow Alcoves (deep twilight cover pockets)
  for (const a of w.alcoves || []) drawShadowAlcove(ctx, a);

  // 3. Stateful Brass Sconces: Lit Warm Chandelier Pools vs Doused Deep Shadow Sanctuaries!
  for (const l of state.lights) {
    if (l.lit) {
      const rad = l.r * (1 + Math.sin(nowSec * 1.7 + l.x * 0.02) * 0.015);
      const gr = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
      gr.addColorStop(0, 'rgba(255, 224, 152, 0.36)');
      gr.addColorStop(0.5, 'rgba(201, 162, 82, 0.15)');
      gr.addColorStop(1, 'rgba(20, 25, 38, 0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad, 0, Math.PI * 2); ctx.fill();
    } else {
      // Freshly doused lamp plunges the area into a deep indigo shadow pocket!
      const rad = l.r * 0.76;
      const dg = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
      dg.addColorStop(0, 'rgba(4, 7, 16, 0.78)');
      dg.addColorStop(0.7, 'rgba(7, 12, 26, 0.52)');
      dg.addColorStop(1, 'rgba(7, 12, 26, 0)');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(l.x, l.y, rad * 0.84, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Curved Art-Deco Archway Doorways
  for (const ar of w.arches || []) drawArtDecoArch(ctx, ar);

  // 5. Low Cover: Tufted Crimson Velvet Gallery Settees (drawn beneath sight cones)
  for (const o of w.obstacles) {
    if (o.kind === 'settee') drawVelvetSettee(ctx, o);
  }

  // 6. Raycast Vision Cones (Brass-Eye Teal Domes + Curator Amber / Breach Crimson / Sweeping Violet-Amber)
  for (const cam of state.cameras) drawCameraCone(ctx, cam);
  for (const g of state.guards) drawGuardCone(ctx, g);

  // 7. Pulsing Crimson Laser Tripwires
  for (const tw of state.tripwires) drawTripwire(ctx, tw, nowSec);

  // 8. Tall Sight-Blocking Architecture: Stepped Brass Walls, Octagonal Marble Columns, Glass Vitrines & Bronze Folding Screens
  for (const o of w.obstacles) {
    if (o.kind !== 'settee') drawTallMuseumProp(ctx, o);
  }

  // 9. Art-Deco Ceiling Chandelier / Brass Sconce Fixtures (Lit vs Doused w/ indigo smoke wisps)
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
      // Extinguished dark brass sconce with delicate indigo smoke wisps & DOUSED tag
      ctx.fillStyle = '#0f1420';
      ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); ctx.stroke();
      // Subtle curling smoke wisps
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
      ctx.beginPath(); ctx.arc(5, -7, 4, 0.4, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4, -10, 3, 1.0, Math.PI * 1.9); ctx.stroke();
      if (state.mode !== 'debrief') {
        drawTag(ctx, 0, 18, 'DOUSED', '#93c5fd', 'rgba(9, 15, 28, 0.92)', '#38bdf8', false);
      }
    }
    ctx.restore();
  }

  // 10. Star Sapphire Vitrine, Museum Relics & Brass Art-Deco Elevator Exit
  drawSapphireAndRelics(ctx, state, nowSec);
  drawBrassElevator(ctx, state, nowSec);

  // 11. Velvet Smoke Veil Clouds (violet-silver drifting mist)
  for (const sm of state.veilsActive) drawVelvetVeil(ctx, sm, nowSec);

  // 12. Diegetic Tactile Callouts (Coin Arc + CLINK!, Curfew Bell waves, Last Glimpse ghost silhouette)
  drawTacticalOverlays(ctx, state, nowSec);

  // 13. Debrief Golden Infiltration Trail (when in debrief mode / 4-debrief.jpg!)
  if (state.mode === 'debrief' && state.debriefTrail) {
    drawGoldenTrail(ctx, state.debriefTrail);
  }

  // Aim preview arc in live play
  if (state.mode === 'play' && !state.shotMode && state.aim.active && state.coins > 0) {
    drawAimArc(ctx, state);
  }

  // 14. Flying Brass Coins
  for (const c of state.coinsInFlight) {
    const u = Math.min(1, c.t / c.dur);
    const x = c.sx + (c.tx - c.sx) * u;
    const y = c.sy + (c.ty - c.sy) * u - Math.sin(u * Math.PI) * 34;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(x, y, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.stroke();
  }

  // 15. Brass-Eye Domes, Infiltrator & Museum Curators/Docents/Inspectors
  for (const cam of state.cameras) drawCameraDome(ctx, cam);
  if (state.mode !== 'debrief') drawInfiltrator(ctx, state);
  for (const g of state.guards) drawGuard(ctx, g);

  // 16. Sparkle Particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
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
  let stroke = 'rgba(240, 208, 132, 0.52)';
  if (g.state === 'BREACH') {
    gr.addColorStop(0, 'rgba(225, 29, 72, 0.56)');
    gr.addColorStop(0.62, 'rgba(190, 18, 60, 0.28)');
    gr.addColorStop(1, 'rgba(159, 18, 57, 0.06)');
    stroke = 'rgba(253, 164, 175, 0.88)';
  } else if (g.state === 'SWEEPING') {
    gr.addColorStop(0, 'rgba(234, 88, 12, 0.52)');
    gr.addColorStop(0.62, 'rgba(168, 85, 247, 0.22)');
    gr.addColorStop(1, 'rgba(126, 34, 206, 0.05)');
    stroke = 'rgba(253, 186, 116, 0.86)';
  } else if (g.state === 'CURIOUS') {
    gr.addColorStop(0, 'rgba(245, 158, 11, 0.52)');
    gr.addColorStop(0.62, 'rgba(217, 119, 6, 0.25)');
    gr.addColorStop(1, 'rgba(180, 83, 9, 0.06)');
    stroke = 'rgba(253, 230, 138, 0.88)';
  } else {
    // Warm golden museum lantern cone (Art-Deco signature)
    gr.addColorStop(0, 'rgba(240, 208, 132, 0.38)');
    gr.addColorStop(0.62, 'rgba(201, 162, 82, 0.17)');
    gr.addColorStop(1, 'rgba(201, 162, 82, 0.03)');
  }
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = g.state === 'PATROL' ? 1.2 : 1.7;
  ctx.stroke();
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

function drawSapphireAndRelics(ctx, state, nowSec) {
  // Gilded Museum Relics (small Art-Deco chalices/gems on pedestals)
  for (const r of state.relicItems) {
    if (r.taken) continue;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.fillStyle = '#2b2217';
    ctx.strokeStyle = '#c9a252';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.fillStyle = '#f0d084';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Star Sapphire Octagonal Pedestal Vitrine
  const S = state.wing.sapphire;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 3.8);
  ctx.save();
  ctx.translate(S.x, S.y);
  ctx.fillStyle = '#182132';
  ctx.strokeStyle = '#e5be67';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    i === 0 ? ctx.moveTo(Math.cos(a) * 19, Math.sin(a) * 19) : ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (!state.sapphireTaken) {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 32 + pulse * 6);
    glow.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
    glow.addColorStop(0.55, 'rgba(37, 99, 235, 0.25)');
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();

    // Faceted royal Star Sapphire crystal
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-2, -3, 2.2, 0, Math.PI * 2); ctx.fill();

    drawTag(ctx, 0, -28, 'STAR SAPPHIRE', '#bae6fd', 'rgba(11, 20, 38, 0.92)', '#38bdf8', false);
  } else {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.72)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    drawTag(ctx, 0, 29, 'SAPPHIRE TAKEN', '#6ee7b7', 'rgba(11, 26, 22, 0.92)', '#34d399', false);
  }
  ctx.restore();
}

function drawBrassElevator(ctx, state, nowSec) {
  const el = state.wing.elevator;
  const open = state.sapphireTaken;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 4.0);

  ctx.save();
  ctx.translate(el.x, el.y);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 38 + pulse * 5);
  glow.addColorStop(0, open ? 'rgba(52, 211, 153, 0.55)' : 'rgba(201, 162, 82, 0.38)');
  glow.addColorStop(1, 'rgba(201, 162, 82, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();

  // Gilded Art-Deco Brass Elevator Cab & Sliding Gate Bars
  ctx.fillStyle = open ? '#113026' : '#241d14';
  ctx.strokeStyle = open ? '#34d399' : '#e5be67';
  ctx.lineWidth = 2.2;
  ctx.fillRect(-19, -18, 38, 36);
  ctx.strokeRect(-19, -18, 38, 36);

  // Semicircular brass floor-dial indicator at top of cab
  ctx.strokeStyle = '#f0d084';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0, -6, 11, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(open ? 6 : -5, -14); ctx.stroke();

  // Vertical gilded elevator gate bars
  ctx.strokeStyle = open ? 'rgba(110, 231, 183, 0.65)' : 'rgba(201, 162, 82, 0.65)';
  ctx.lineWidth = 1.2;
  for (const bx of [-10, -4, 4, 10]) {
    ctx.beginPath(); ctx.moveTo(bx, -3); ctx.lineTo(bx, 15); ctx.stroke();
  }
  drawTag(ctx, 0, 28, open ? 'ELEVATOR OPEN' : 'ELEVATOR', open ? '#6ee7b7' : '#f0d084', 'rgba(13, 16, 24, 0.94)', open ? '#34d399' : '#c9a252', false);
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
    if (g.lurePos) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.78)';
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.lurePos.x, g.lurePos.y); ctx.stroke();
      ctx.restore();
    }
  }

  for (const rp of state.ripples) {
    ctx.save();
    const isCoin = rp.kind === 'coin';
    ctx.strokeStyle = isCoin ? `rgba(240, 208, 132, ${rp.alpha})` : `rgba(56, 189, 248, ${rp.alpha * 0.72})`;
    ctx.lineWidth = isCoin ? 2 : 1.3;
    ctx.setLineDash(isCoin ? [7, 4] : [4, 5]);
    ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (isCoin) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(rp.x, rp.y, 4.4, 0, Math.PI * 2); ctx.fill();
      if (rp.label) drawTag(ctx, rp.x, rp.y - 19, rp.label, '#fef08a', 'rgba(24, 18, 8, 0.94)', '#f0d084');
    }
    ctx.restore();
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
  const hidden = p.inShadow || p.inVeil || p.inAlcove || (p.inSettee && p.crouched);
  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.strokeStyle = hidden ? '#38bdf8' : '#f0d084';
  ctx.lineWidth = 2;
  if (hidden) ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(0, 0, p.r + 5, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Art-Deco Midnight Cloak Silhouette + Gilded Mask Visor
  ctx.rotate(p.angle);
  ctx.fillStyle = '#0e1d30';
  ctx.strokeStyle = hidden ? '#7dd3fc' : '#f4ece0';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(-1, 0, p.r - 0.5, p.r + 1.2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = state.sapphireTaken ? '#38bdf8' : '#f0d084';
  ctx.beginPath();
  ctx.moveTo(7.5, 0); ctx.lineTo(1.2, -4.5); ctx.lineTo(3.2, 0); ctx.lineTo(1.2, 4.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  if (hidden && state.detectionState !== 'BREACH') {
    const lbl = p.inVeil ? 'VELVET VEIL' : p.inDoused ? 'DEEP SHADOW' : p.inAlcove ? 'SHADOW ALCOVE' : 'UNSEEN · SHADOW';
    drawTag(ctx, p.x, p.y + 23, lbl, '#7dd3fc', 'rgba(10, 18, 32, 0.94)', '#38bdf8');
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

  // Diegetic world-space callout pill above curious/breach/sweeping guards
  if (g.callout) {
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

function drawTag(ctx, x, y, text, fg, bg, border, clamp = true) {
  ctx.save();
  ctx.font = '800 9.5px ui-monospace, SFMono-Regular, monospace';
  const tw = ctx.measureText(text).width + 12;
  const bx = clamp ? Math.max(18, Math.min(STAGE_W - tw - 18, x - tw / 2)) : x - tw / 2;
  const by = clamp ? Math.max(18, Math.min(STAGE_H - 22, y - 8)) : y - 8;
  ctx.fillStyle = bg;
  ctx.fillRect(bx, by, tw, 16);
  ctx.strokeStyle = border || fg;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 15);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, by + 8.5);
  ctx.restore();
}
