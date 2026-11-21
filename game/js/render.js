// Velvet Curfew — Painterly 2.5D Art-Deco Overhead Canvas2D Renderer

import { STAGE_H, STAGE_W } from './levels.js';

const floorCache = new Map();

// Pre-render rich Art-Deco terrazzo marble, brass inlays, crimson carpet & compass per wing
function getFloorCanvas(wing) {
  if (floorCache.has(wing.id)) return floorCache.get(wing.id);
  const off = document.createElement('canvas');
  off.width = STAGE_W;
  off.height = STAGE_H;
  const g = off.getContext('2d');

  // Deep midnight terrazzo base
  g.fillStyle = '#0d1527';
  g.fillRect(0, 0, STAGE_W, STAGE_H);

  // Subtle alternating slate-indigo marble checkerboard tiles (32px)
  const tile = 32;
  for (let y = 16; y < STAGE_H - 16; y += tile) {
    for (let x = 16; x < STAGE_W - 16; x += tile) {
      const alt = ((x + y) / tile) % 2 === 0;
      g.fillStyle = alt ? '#111b31' : '#0d1527';
      g.fillRect(x, y, tile, tile);
      // Faint terrazzo mineral flecks
      g.fillStyle = alt ? 'rgba(244,234,213,0.03)' : 'rgba(212,168,79,0.025)';
      g.fillRect(x + ((x * 7 + y) % 22), y + ((y * 5 + x) % 22), 2, 2);
    }
  }

  // Thin warm brass architectural floor framing lines
  g.strokeStyle = 'rgba(212, 168, 79, 0.16)';
  g.lineWidth = 1;
  g.strokeRect(26, 26, STAGE_W - 52, STAGE_H - 52);
  g.strokeRect(32, 32, STAGE_W - 64, STAGE_H - 64);

  // Crimson velvet carpet runners with double gold Art-Deco trim
  for (const c of wing.carpets) {
    const grad = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    grad.addColorStop(0, '#5a1927');
    grad.addColorStop(0.5, '#732133');
    grad.addColorStop(1, '#4c1421');
    g.fillStyle = grad;
    g.fillRect(c.x, c.y, c.w, c.h);

    // Subtle woven chevron texture
    g.strokeStyle = 'rgba(242, 204, 120, 0.08)';
    g.lineWidth = 1;
    for (let k = -c.h; k < c.w + c.h; k += 18) {
      g.beginPath();
      g.moveTo(c.x + Math.max(0, k), c.y + Math.max(0, -k));
      g.lineTo(c.x + Math.min(c.w, k + c.h), c.y + Math.min(c.h, c.h - Math.max(0, k + c.h - c.w)));
      g.stroke();
    }

    g.strokeStyle = 'rgba(212, 168, 79, 0.62)';
    g.lineWidth = 1.5;
    g.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    g.strokeStyle = 'rgba(244, 234, 213, 0.22)';
    g.lineWidth = 0.8;
    g.strokeRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
  }

  // Grand Brass Meridian Compass Rose etched in rotunda floor
  if (wing.compass) {
    const { x, y, r } = wing.compass;
    g.save();
    g.translate(x, y);
    g.strokeStyle = 'rgba(212, 168, 79, 0.34)';
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.72, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const outer = i % 2 === 0 ? r : r * 0.78;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
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

  // 1. Cached Art-Deco Floor
  ctx.drawImage(getFloorCanvas(w), 0, 0);

  // 2. Deep Indigo Safe-Shadow Pockets (unmistakable cool cyan-rimmed stealth sanctuaries)
  for (const s of w.shadows) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 9, 22, 0.66)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    // Subtle cool diagonal stealth hatching
    ctx.beginPath();
    ctx.rect(s.x, s.y, s.w, s.h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let d = -s.h; d < s.w + s.h; d += 12) {
      ctx.beginPath();
      ctx.moveTo(s.x + d, s.y);
      ctx.lineTo(s.x + d - s.h, s.y + s.h);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.36)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.1;
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.restore();
  }

  // 3. Warm Golden Chandelier Light Pools (clear visual contrast vs shadows)
  for (const l of w.lights) {
    const pulse = 1 + Math.sin(nowSec * 1.9 + l.x * 0.03) * 0.025;
    const rad = l.r * pulse;
    const grad = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
    grad.addColorStop(0, 'rgba(255, 226, 148, 0.34)');
    grad.addColorStop(0.52, 'rgba(212, 168, 79, 0.16)');
    grad.addColorStop(1, 'rgba(212, 168, 79, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, rad, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Art-Deco chandelier ring halo & brass sunburst center
    ctx.strokeStyle = 'rgba(242, 204, 120, 0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(l.x, l.y, rad * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle emerald-gold extraction guide from secured ledger toward open Roof Exit
  if (state.ledgerStolen) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.28)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(w.ledger.x, w.ledger.y);
    ctx.lineTo(w.exit.x, w.exit.y);
    ctx.stroke();
    ctx.restore();
  }

  // Optional Amber Monocle perk: faint patrol routes
  if (state.mods.showRoutes) {
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 168, 79, 0.22)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.2;
    for (const g of state.guards) {
      ctx.beginPath();
      g.waypoints.forEach((wp, i) => (i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Dual-State True Raycast Vision Cones (Drawn BEFORE 3D obstacles so pillars slice them cleanly!)
  for (const g of state.guards) {
    drawVisionCone(ctx, g);
  }

  // 5. Objectives: Vault Ledger Pedestal, Gilded Relic & Glowing Emerald Roof Exit
  drawLedgerAndRelic(ctx, state, nowSec);
  drawExitPortal(ctx, state, nowSec);

  // 6. Concentric Dashed Acoustic Ripples (Footsteps & Brass Coin Lures)
  for (const rp of state.ripples) {
    ctx.save();
    const isCoin = rp.kind === 'coin';
    const isLoot = rp.kind === 'loot';
    ctx.strokeStyle = isCoin
      ? `rgba(242, 204, 120, ${rp.alpha})`
      : isLoot
      ? `rgba(34, 197, 94, ${rp.alpha})`
      : `rgba(56, 189, 248, ${rp.alpha * 0.85})`;
    ctx.lineWidth = isCoin ? 2 : 1.4;
    ctx.setLineDash(isCoin ? [7, 5] : [4, 5]);
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.stroke();
    if (isCoin) {
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(242, 204, 120, ${rp.alpha})`;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (rp.label) {
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(1, rp.alpha + 0.15)})`;
        ctx.fillText(rp.label, rp.x, rp.y - 10);
      }
    }
    ctx.restore();
  }

  // Coin throw arc preview when aiming in active play
  if (state.mode === 'play' && !state.shotMode && state.aim.active && state.coins > 0) {
    drawAimArc(ctx, state);
  }

  // 7. 3D-Extruded Walls, Marble Pillars, Bookshelves, Banquettes & Vitrines
  drawObstacles3D(ctx, w.obstacles);

  // 8. Active Velvet Smoke Clouds
  for (const sm of state.smokesActive) {
    drawSmokeCloud(ctx, sm, nowSec);
  }

  // 9. Flying Brass Coins
  for (const c of state.coinsInFlight) {
    const u = Math.min(1, c.t / c.dur);
    const x = c.sx + (c.tx - c.sx) * u;
    const y = c.sy + (c.ty - c.sy) * u - Math.sin(u * Math.PI) * 34;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 10. Infiltrator & Museum Guards
  drawInfiltrator(ctx, state, nowSec);
  for (const g of state.guards) {
    drawGuard(ctx, g, nowSec);
  }

  // 11. Sparkle Particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 12. Subtle Noir Edge Vignette framing the canvas
  const vig = ctx.createRadialGradient(STAGE_W / 2, STAGE_H / 2, STAGE_H * 0.36, STAGE_W / 2, STAGE_H / 2, STAGE_W * 0.64);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(3, 6, 14, 0.44)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
}

function drawVisionCone(ctx, g) {
  const poly = g.visionPoly;
  if (!poly || poly.length < 3) return;
  const isAlert = g.state === 'ALERT';
  const isSusp = g.state === 'SUSPICIOUS' || g.state === 'SEARCH' || g.suspicion > 0.2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();

  const grad = ctx.createRadialGradient(g.x, g.y, 8, g.x, g.y, g.spec.visionRange);
  if (isAlert) {
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.56)');
    grad.addColorStop(0.6, 'rgba(220, 38, 38, 0.3)');
    grad.addColorStop(1, 'rgba(185, 28, 28, 0.08)');
  } else if (isSusp) {
    grad.addColorStop(0, 'rgba(249, 115, 22, 0.52)');
    grad.addColorStop(0.58, 'rgba(234, 88, 12, 0.27)');
    grad.addColorStop(1, 'rgba(194, 65, 12, 0.07)');
  } else {
    grad.addColorStop(0, 'rgba(242, 204, 120, 0.38)');
    grad.addColorStop(0.6, 'rgba(212, 168, 79, 0.19)');
    grad.addColorStop(1, 'rgba(212, 168, 79, 0.04)');
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = isAlert
    ? 'rgba(252, 165, 165, 0.78)'
    : isSusp
    ? 'rgba(253, 186, 116, 0.72)'
    : 'rgba(242, 204, 120, 0.44)';
  ctx.lineWidth = isAlert || isSusp ? 1.6 : 1.1;
  ctx.stroke();
  ctx.restore();
}

function drawObstacles3D(ctx, obstacles) {
  const depth = 11;
  for (const o of obstacles) {
    // Grounded drop shadow
    ctx.fillStyle = 'rgba(2, 5, 14, 0.58)';
    ctx.fillRect(o.x + 6, o.y + 8, o.w, o.h);

    if (o.kind === 'wall') {
      ctx.fillStyle = '#192338';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = 'rgba(212, 168, 79, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
      continue;
    }

    // 3D front extrusion face (gives crisp 2.5D architectural weight)
    const palettes = {
      pillar: { front: '#1b2640', top: '#2b3b5e', rim: '#d4a84f', inner: '#394c76' },
      shelf: { front: '#2a1a18', top: '#4a2b24', rim: '#d4a84f', inner: '#623a2f' },
      banquette: { front: '#4a1423', top: '#7a2237', rim: '#e6bd68', inner: '#932c45' },
      vitrine: { front: '#152d3c', top: '#1e4257', rim: '#7dd3fc', inner: '#285873' },
    };
    const pal = palettes[o.kind] || palettes.pillar;

    // Front vertical elevation
    ctx.fillStyle = pal.front;
    ctx.fillRect(o.x, o.y + o.h - depth, o.w, depth);

    // Top bevel face lifted up slightly
    ctx.fillStyle = pal.top;
    ctx.fillRect(o.x, o.y - 3, o.w, o.h - depth + 4);

    // Inner Deco inset panel
    if (o.w > 22 && o.h > 22) {
      ctx.fillStyle = pal.inner;
      ctx.fillRect(o.x + 5, o.y + 2, o.w - 10, Math.max(4, o.h - depth - 6));
    }

    // Fluted Deco corner studs for pillars
    if (o.kind === 'pillar') {
      ctx.fillStyle = 'rgba(242, 204, 120, 0.55)';
      ctx.fillRect(o.x + 3, o.y, 4, 4);
      ctx.fillRect(o.x + o.w - 7, o.y, 4, 4);
      ctx.fillRect(o.x + 3, o.y + o.h - depth - 4, 4, 4);
      ctx.fillRect(o.x + o.w - 7, o.y + o.h - depth - 4, 4, 4);
    }

    // Warm brass top bevel outline
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(o.x + 0.5, o.y - 2.5, o.w - 1, o.h - depth + 3);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeRect(o.x + 0.5, o.y + o.h - depth + 0.5, o.w - 1, depth - 1);
  }
}

function drawLedgerAndRelic(ctx, state, nowSec) {
  const L = state.wing.ledger;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 3.8);

  // Central Vault Pedestal
  ctx.save();
  ctx.translate(L.x, L.y);
  ctx.fillStyle = '#18243d';
  ctx.strokeStyle = '#d4a84f';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeRect(-16, -16, 32, 32);

  if (!state.ledgerStolen) {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28 + pulse * 6);
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();

    // Golden Vault Ledger book
    ctx.fillStyle = '#f2cc78';
    ctx.fillRect(-8, -10, 16, 20);
    ctx.fillStyle = '#8a1c31';
    ctx.fillRect(-6, -8, 12, 16);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-8, -10, 16, 20);

    drawWorldTag(ctx, 0, -24, 'LEDGER', '#f2cc78', 'rgba(11,17,32,0.88)', false);
  } else {
    // Open empty pedestal after stealing
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.setLineDash([]);
    drawWorldTag(ctx, 0, -26, 'LEDGER SECURED', '#4ade80', 'rgba(11,17,32,0.9)', false);
  }
  ctx.restore();

  // Optional Bonus Gilded Relic
  const R = state.wing.relic;
  if (R && !state.relicStolen) {
    ctx.save();
    ctx.translate(R.x, R.y);
    const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    rg.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#f2cc78';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.rotate(-Math.PI / 4);
    drawWorldTag(ctx, 0, 22, 'RELIC +600', '#7dd3fc', 'rgba(11,17,32,0.9)', false);
    ctx.restore();
  }
}

function drawExitPortal(ctx, state, nowSec) {
  const ex = state.wing.exit;
  const open = state.ledgerStolen;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 4.2);

  ctx.save();
  ctx.translate(ex.x, ex.y);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, ex.r + 18 + pulse * 6);
  glow.addColorStop(0, open ? 'rgba(34, 197, 94, 0.58)' : 'rgba(148, 163, 184, 0.22)');
  glow.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, ex.r + 22, 0, Math.PI * 2); ctx.fill();

  // Art-Deco Emerald Archway Octagon
  ctx.fillStyle = open ? 'rgba(16, 185, 129, 0.26)' : 'rgba(30, 41, 59, 0.5)';
  ctx.strokeStyle = open ? '#4ade80' : '#64748b';
  ctx.lineWidth = open ? 2.4 : 1.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const rx = Math.cos(a) * ex.r;
    const ry = Math.sin(a) * ex.r;
    i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chevron exit arrow
  ctx.fillStyle = open ? '#bbf7d0' : '#94a3b8';
  ctx.font = '700 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', 0, 1);

  drawWorldTag(ctx, 0, ex.r + 14, open ? 'EXIT OPEN' : 'LOCKED', open ? '#4ade80' : '#94a3b8', 'rgba(11,17,32,0.92)', false);
  ctx.restore();
}

function drawSmokeCloud(ctx, sm, nowSec) {
  ctx.save();
  ctx.globalAlpha = sm.alpha;
  const lobes = [
    { ox: 0, oy: 0, s: 1.0 },
    { ox: Math.cos(nowSec * 0.9) * 14, oy: Math.sin(nowSec * 0.8) * 10, s: 0.72 },
    { ox: -15, oy: 9, s: 0.68 },
    { ox: 14, oy: -10, s: 0.64 },
  ];
  for (const lb of lobes) {
    const r = sm.r * lb.s;
    const g = ctx.createRadialGradient(sm.x + lb.ox, sm.y + lb.oy, 4, sm.x + lb.ox, sm.y + lb.oy, r);
    g.addColorStop(0, 'rgba(67, 45, 110, 0.88)');
    g.addColorStop(0.6, 'rgba(34, 24, 66, 0.72)');
    g.addColorStop(1, 'rgba(19, 14, 42, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sm.x + lb.ox, sm.y + lb.oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.42)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(sm.x, sm.y, sm.r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawInfiltrator(ctx, state, nowSec) {
  const p = state.player;
  const hidden = p.inShadow || p.inSmoke;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 5);

  ctx.save();
  ctx.translate(p.x, p.y);

  // Subtle Stealth Aura Ring (Cyan when HIDDEN, Amber when EXPOSED)
  ctx.strokeStyle = hidden
    ? `rgba(56, 189, 248, ${0.65 + pulse * 0.25})`
    : p.inLight
    ? 'rgba(251, 191, 36, 0.85)'
    : 'rgba(244, 234, 213, 0.4)';
  ctx.lineWidth = hidden ? 2.2 : 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, p.r + (p.crouched ? 5 : 7), 0, Math.PI * 2);
  ctx.stroke();

  // Soft shadow underneath
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(2, 5, p.r + 1, p.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  // Infiltrator cloaked shoulders + Art-Deco cowl facing movement angle
  ctx.rotate(p.angle);
  ctx.fillStyle = hidden ? '#0f2942' : '#1e293b';
  ctx.strokeStyle = hidden ? '#38bdf8' : '#f4ead5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-1, 0, p.crouched ? 8.5 : 10, p.crouched ? 10 : 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crisp gold/ivory mask visor pointing forward
  ctx.fillStyle = state.ledgerStolen ? '#f2cc78' : '#e0f2fe';
  ctx.beginPath();
  ctx.arc(4, 0, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Crisp World-Space Status Pill ("HIDDEN" / "EXPOSED")
  if (hidden) {
    drawWorldTag(ctx, p.x, p.y - 22, p.inSmoke ? 'SMOKED' : 'HIDDEN', '#38bdf8', 'rgba(8, 17, 34, 0.92)');
  } else if (p.inLight) {
    drawWorldTag(ctx, p.x, p.y - 22, 'EXPOSED', '#fcd34d', 'rgba(38, 22, 6, 0.92)');
  }
}

function drawGuard(ctx, g, nowSec) {
  ctx.save();
  ctx.translate(g.x, g.y);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(2, 6, g.r + 1, g.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  // Radial suspicion progress ring around guard when investigating
  if (g.suspicion > 0.04 || g.state === 'ALERT') {
    const pct = g.state === 'ALERT' ? 1 : g.suspicion;
    ctx.strokeStyle = g.state === 'ALERT' ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, g.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
  }

  ctx.rotate(g.angle);

  // Uniformed shoulders in crisp high-contrast ivory & brass/crimson trim
  ctx.fillStyle = '#f4ead5';
  ctx.strokeStyle = g.spec.accent;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 9.5, 12.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Brass cap / emblem
  ctx.fillStyle = g.spec.color;
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();

  // Glowing Handheld Brass Lantern at right front
  const lf = 0.85 + 0.15 * Math.sin(nowSec * 9 + g.id);
  ctx.fillStyle = `rgba(254, 240, 138, ${lf})`;
  ctx.beginPath();
  ctx.arc(10, 5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // World-space ? or ! indicator pill above guard
  if (g.state === 'ALERT') {
    drawWorldTag(ctx, g.x, g.y - 23, '! ALERT', '#fca5a5', 'rgba(127, 29, 29, 0.94)');
  } else if (g.state === 'SUSPICIOUS' || g.state === 'SEARCH' || g.suspicion > 0.2) {
    const pct = Math.round(g.suspicion * 100);
    drawWorldTag(ctx, g.x, g.y - 23, `? ${pct}%`, '#fde68a', 'rgba(69, 26, 3, 0.92)');
  }
}

function drawAimArc(ctx, state) {
  const p = state.player;
  const maxDist = 210 * state.mods.throwRangeMult;
  let dx = state.aim.x - p.x;
  let dy = state.aim.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 24) return;
  if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
  const tx = p.x + dx;
  const ty = p.y + dy;
  ctx.save();
  ctx.strokeStyle = 'rgba(242, 204, 120, 0.45)';
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo((p.x + tx) / 2, (p.y + ty) / 2 - 22, tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(tx, ty, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawWorldTag(ctx, x, y, text, fg, bg, clamp = true) {
  ctx.save();
  ctx.font = '700 9.5px ui-monospace, SFMono-Regular, monospace';
  const tw = ctx.measureText(text).width + 10;
  const bx = clamp ? Math.max(20, Math.min(STAGE_W - tw - 20, x - tw / 2)) : x - tw / 2;
  const by = clamp ? Math.max(18, Math.min(STAGE_H - 22, y - 8)) : y - 8;
  ctx.fillStyle = bg;
  ctx.fillRect(bx, by, tw, 15);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 14);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, by + 8);
  ctx.restore();
}
