// Velvet Curfew v2 — 5 Multi-Room Architectural Museum Wings (820x576), Cameras, Tripwires & Perks

export const STAGE_W = 820;
export const STAGE_H = 576;

export const GUARD_TYPES = {
  warden: {
    id: 'warden', name: 'Lantern Warden',
    speed: 62, chaseSpeed: 108, visionRange: 192, fov: 0.74, hearMult: 1.0, suspicionRate: 0.85,
    color: '#f59e0b', accent: '#fef3c7',
  },
  hound: {
    id: 'hound', name: 'Bell Hound',
    speed: 82, chaseSpeed: 128, visionRange: 158, fov: 0.64, hearMult: 1.48, suspicionRate: 0.96,
    color: '#fb923c', accent: '#ffedd5',
  },
  captain: {
    id: 'captain', name: 'Night Captain',
    speed: 58, chaseSpeed: 116, visionRange: 214, fov: 0.86, hearMult: 1.15, suspicionRate: 1.12,
    color: '#ef4444', accent: '#fee2e2',
  },
};

export const PERKS = [
  { id: 'felt-soles', name: 'Felt Soles', tag: 'ACOUSTIC', desc: '-45% footstep noise on stone & +15% crouch speed.', apply: (m) => { m.noiseMult *= 0.55; m.crouchSpeedMult *= 1.15; } },
  { id: 'brass-resonator', name: 'Brass Resonator', tag: 'GADGET', desc: '+2 Coin Lures, +35% ripple radius & longer guard pull.', apply: (m) => { m.bonusCoins += 2; m.lureRadiusMult *= 1.35; m.lureHoldBonus += 2.0; } },
  { id: 'nightshade-veil', name: 'Nightshade Veil', tag: 'SHADOW', desc: 'Shadow cover lingers 1.5s & +1 Velvet Smoke.', apply: (m) => { m.shadowLinger += 1.5; m.bonusSmokes += 1; } },
  { id: 'velvet-cloak', name: 'Velvet Cloak', tag: 'SHADOW', desc: '-30% suspicion buildup & +40% alert recovery rate.', apply: (m) => { m.suspicionMult *= 0.7; m.recoveryMult *= 1.4; } },
  { id: 'clockwork-key', name: 'Clockwork Key', tag: 'HEIST', desc: 'Extended loot reach & +25% heist score bonus.', apply: (m) => { m.lootRangeBonus += 16; m.scoreMult *= 1.25; } },
  { id: 'plum-incense', name: 'Plum Incense', tag: 'GADGET', desc: '+30% Velvet Smoke radius & +3s linger duration.', apply: (m) => { m.smokeRadiusMult *= 1.3; m.smokeDurationBonus += 3.0; } },
  { id: 'silk-gloves', name: 'Silk Gloves', tag: 'AGILITY', desc: '+18% coin throw distance & +12% movement speed.', apply: (m) => { m.throwRangeMult *= 1.18; m.speedMult *= 1.12; } },
  { id: 'mercury-heel', name: 'Mercury Heel', tag: 'AGILITY', desc: 'Near-miss recoveries trigger a 2.4s silent burst.', apply: (m) => { m.recoveryBurst = true; } },
  { id: 'echo-mint', name: 'Echo Mint', tag: 'GADGET', desc: 'Regain 1 Coin when a guard finishes checking a lure.', apply: (m) => { m.coinRefund = true; } },
];

function perimeter() {
  return [
    { x: 0, y: 0, w: STAGE_W, h: 16, kind: 'wall' },
    { x: 0, y: STAGE_H - 16, w: STAGE_W, h: 16, kind: 'wall' },
    { x: 0, y: 16, w: 16, h: STAGE_H - 32, kind: 'wall' },
    { x: STAGE_W - 16, y: 16, w: 16, h: STAGE_H - 32, kind: 'wall' },
  ];
}

// Note on obstacle kinds:
// 'wall' | 'glass' | 'crate' | 'pillar' -> solid + blocks sightlines (glass blocks movement, lets vision through!)
// 'low' -> crouch-hide cover (velvet planters / benches): player crouched inside/beside is HIDDEN from cones!
export const WINGS = [
  // WING 1: MERIDIAN ROTUNDA
  {
    id: 0, num: 1, title: 'THE MERIDIAN ROTUNDA', par: 95,
    objective: 'Steal the Meridian Ledger from the rotunda, then reach the Exit',
    spawn: { x: 64, y: 508 },
    ledger: { x: 410, y: 276, label: 'Meridian Ledger' },
    exit: { x: 758, y: 66, r: 22 },
    coins: 4, smokes: 2,
    loot: [{ x: 112, y: 92 }, { x: 720, y: 492 }, { x: 410, y: 96 }],
    carpets: [{ x: 356, y: 44, w: 108, h: 488 }, { x: 72, y: 230, w: 676, h: 92 }],
    lights: [{ x: 410, y: 276, r: 108 }, { x: 170, y: 120, r: 92 }, { x: 650, y: 120, r: 92 }, { x: 650, y: 440, r: 92 }, { x: 170, y: 430, r: 88 }],
    doorways: [{ x: 256, y: 160, w: 54, h: 14 }, { x: 510, y: 160, w: 54, h: 14 }, { x: 256, y: 392, w: 54, h: 14 }, { x: 510, y: 392, w: 54, h: 14 }],
    obstacles: [
      ...perimeter(),
      // Architectural room partitions with clear doorways
      { x: 16, y: 160, w: 240, h: 16, kind: 'wall' },
      { x: 310, y: 160, w: 46, h: 16, kind: 'wall' },
      { x: 464, y: 160, w: 46, h: 16, kind: 'wall' },
      { x: 564, y: 160, w: 240, h: 16, kind: 'wall' },
      { x: 16, y: 392, w: 240, h: 16, kind: 'wall' },
      { x: 564, y: 392, w: 240, h: 16, kind: 'wall' },
      // Tall marble pillars / mahogany crates
      { x: 246, y: 248, w: 52, h: 52, kind: 'crate' },
      { x: 522, y: 248, w: 52, h: 52, kind: 'crate' },
      { x: 386, y: 444, w: 48, h: 48, kind: 'pillar' },
      // Low velvet planters (crouch to hide)
      { x: 108, y: 266, w: 66, h: 30, kind: 'low' },
      { x: 642, y: 266, w: 66, h: 30, kind: 'low' },
      { x: 168, y: 472, w: 66, h: 28, kind: 'low' },
      { x: 576, y: 66, w: 66, h: 28, kind: 'low' },
    ],
    cameras: [{ x: 794, y: 276, baseAngle: Math.PI, sweep: 0.72, speed: 0.75, range: 175, fov: 0.62 }],
    tripwires: [],
    guards: [
      { type: 'warden', x: 342, y: 204, angle: 1.57, waypoints: [{ x: 342, y: 108 }, { x: 342, y: 466 }, { x: 190, y: 466 }, { x: 190, y: 320 }] },
      { type: 'warden', x: 604, y: 336, angle: -1.57, waypoints: [{ x: 604, y: 478 }, { x: 604, y: 112 }] },
      { type: 'captain', x: 478, y: 114, angle: 3.14, waypoints: [{ x: 330, y: 114 }, { x: 690, y: 114 }] },
    ],
  },

  // WING 2: THE MERIDIAN ARCHIVE (Used in ?shot=searching!)
  {
    id: 1, num: 2, title: 'THE MERIDIAN ARCHIVE', par: 105,
    objective: 'Lift the Ward-Ledger from the counting-house, then escape',
    spawn: { x: 108, y: 486 },
    ledger: { x: 690, y: 360, label: 'Ward-Ledger' },
    exit: { x: 48, y: 526, r: 22 },
    coins: 4, smokes: 2,
    loot: [{ x: 724, y: 74 }, { x: 68, y: 348 }, { x: 382, y: 486 }],
    carpets: [{ x: 248, y: 30, w: 248, h: 174 }],
    lights: [
      { x: 184, y: 76, r: 90 }, { x: 560, y: 76, r: 92 }, { x: 88, y: 244, r: 88 },
      { x: 440, y: 356, r: 92 }, { x: 668, y: 214, r: 90 }, { x: 656, y: 432, r: 92 },
      { x: 382, y: 506, r: 82 }, { x: 192, y: 492, r: 82 },
    ],
    doorways: [
      { x: 102, y: 60, w: 14, h: 48 }, { x: 634, y: 46, w: 14, h: 48 },
      { x: 562, y: 342, w: 14, h: 48 }, { x: 416, y: 412, w: 48, h: 14 },
      { x: 74, y: 412, w: 48, h: 14 }, { x: 480, y: 472, w: 14, h: 46 },
    ],
    obstacles: [
      ...perimeter(),
      // Multi-room archival chambers & side vaults
      { x: 102, y: 16, w: 18, h: 44, kind: 'wall' },
      { x: 102, y: 108, w: 18, h: 46, kind: 'wall' },
      { x: 16, y: 138, w: 104, h: 16, kind: 'wall' },
      { x: 632, y: 16, w: 18, h: 30, kind: 'wall' },
      { x: 632, y: 94, w: 18, h: 52, kind: 'wall' },
      { x: 632, y: 130, w: 172, h: 16, kind: 'wall' },
      // Mid-level dividing corridors
      { x: 16, y: 286, w: 168, h: 18, kind: 'wall' },
      { x: 140, y: 304, w: 18, h: 112, kind: 'wall' },
      { x: 16, y: 410, w: 58, h: 16, kind: 'wall' },
      { x: 122, y: 410, w: 104, h: 16, kind: 'wall' },
      { x: 482, y: 286, w: 94, h: 18, kind: 'wall' },
      { x: 560, y: 304, w: 18, h: 38, kind: 'wall' },
      { x: 560, y: 390, w: 18, h: 38, kind: 'wall' },
      { x: 274, y: 410, w: 142, h: 16, kind: 'wall' },
      { x: 464, y: 410, w: 114, h: 16, kind: 'wall' },
      { x: 274, y: 426, w: 18, h: 134, kind: 'wall' },
      { x: 478, y: 426, w: 18, h: 46, kind: 'wall' },
      { x: 478, y: 518, w: 18, h: 42, kind: 'wall' },
      // Tall mahogany archive crates (block sightlines)
      { x: 174, y: 142, w: 52, h: 52, kind: 'crate' },
      { x: 550, y: 142, w: 52, h: 52, kind: 'crate' },
      { x: 350, y: 222, w: 52, h: 52, kind: 'crate' },
      { x: 250, y: 318, w: 48, h: 48, kind: 'crate' },
      { x: 604, y: 448, w: 54, h: 54, kind: 'crate' },
      // Low velvet planters / book benches (crouch to hide)
      { x: 276, y: 66, w: 54, h: 28, kind: 'low' },
      { x: 380, y: 66, w: 54, h: 28, kind: 'low' },
      { x: 276, y: 140, w: 54, h: 28, kind: 'low' },
      { x: 426, y: 140, w: 54, h: 28, kind: 'low' },
      { x: 150, y: 224, w: 72, h: 26, kind: 'low' },
      { x: 524, y: 224, w: 72, h: 26, kind: 'low' },
      { x: 326, y: 316, w: 54, h: 26, kind: 'low' },
      { x: 420, y: 368, w: 66, h: 26, kind: 'low' },
      { x: 76, y: 468, w: 56, h: 26, kind: 'low' },
    ],
    cameras: [
      { x: 314, y: 314, baseAngle: 1.72, sweep: 0.65, speed: 0.68, range: 138, fov: 0.58 },
    ],
    tripwires: [],
    guards: [
      { type: 'captain', x: 362, y: 142, angle: -1.12, waypoints: [{ x: 264, y: 112 }, { x: 480, y: 112 }] },
      { type: 'warden', x: 238, y: 536, angle: -1.57, waypoints: [{ x: 238, y: 536 }, { x: 238, y: 360 }] },
      { type: 'hound', x: 768, y: 394, angle: 2.1, waypoints: [{ x: 768, y: 210 }, { x: 768, y: 518 }] },
    ],
  },

  // WING 3: THE GLASS CONSERVATORY (HERO COVER ?shot=play!)
  {
    id: 2, num: 3, title: 'THE GLASS CONSERVATORY', par: 110,
    objective: 'Take the Orchid Ledger from the atrium, then reach the Exit',
    spawn: { x: 256, y: 454 },
    ledger: { x: 416, y: 332, label: 'Orchid Ledger' },
    exit: { x: 48, y: 526, r: 22 },
    coins: 4, smokes: 2,
    loot: [{ x: 316, y: 536 }, { x: 566, y: 536 }, { x: 768, y: 536 }],
    carpets: [{ x: 376, y: 294, w: 80, h: 78 }],
    lights: [
      { x: 214, y: 74, r: 94 }, { x: 444, y: 74, r: 94 },
      { x: 416, y: 214, r: 98 }, { x: 642, y: 334, r: 96 },
      { x: 416, y: 472, r: 96 }, { x: 92, y: 472, r: 88 }, { x: 718, y: 472, r: 88 },
    ],
    doorways: [{ x: 214, y: 158, w: 14, h: 24 }, { x: 332, y: 92, w: 14, h: 42 }, { x: 688, y: 158, w: 14, h: 24 }],
    obstacles: [
      ...perimeter(),
      // Conservatory architectural wall + glasshouse partitions
      { x: 330, y: 16, w: 22, h: 76, kind: 'wall' },
      { x: 330, y: 134, w: 22, h: 42, kind: 'wall' },
      { x: 122, y: 24, w: 18, h: 146, kind: 'glass' },
      { x: 122, y: 156, w: 92, h: 18, kind: 'glass' },
      { x: 228, y: 156, w: 102, h: 18, kind: 'glass' },
      { x: 584, y: 24, w: 18, h: 146, kind: 'glass' },
      { x: 584, y: 156, w: 104, h: 18, kind: 'glass' },
      { x: 702, y: 156, w: 102, h: 18, kind: 'glass' },
      // Tall mahogany crates around the central orchid vault (slice vision cones dramatically!)
      { x: 300, y: 256, w: 54, h: 54, kind: 'crate' },
      { x: 458, y: 256, w: 54, h: 54, kind: 'crate' },
      { x: 300, y: 386, w: 54, h: 54, kind: 'crate' },
      { x: 458, y: 386, w: 54, h: 54, kind: 'crate' },
      // Lush emerald conservatory planters (Low Cover — crouch to hide)
      { x: 74, y: 124, w: 46, h: 26, kind: 'low' },
      { x: 226, y: 100, w: 50, h: 26, kind: 'low' },
      { x: 406, y: 124, w: 52, h: 26, kind: 'low' },
      { x: 506, y: 124, w: 52, h: 26, kind: 'low' },
      { x: 204, y: 206, w: 48, h: 48, kind: 'low' },
      { x: 604, y: 206, w: 48, h: 48, kind: 'low' },
      { x: 54, y: 280, w: 48, h: 26, kind: 'low' },
      { x: 54, y: 388, w: 48, h: 26, kind: 'low' },
      { x: 678, y: 280, w: 48, h: 26, kind: 'low' },
      { x: 678, y: 388, w: 48, h: 26, kind: 'low' },
      { x: 204, y: 438, w: 48, h: 48, kind: 'low' },
      { x: 604, y: 438, w: 48, h: 48, kind: 'low' },
    ],
    cameras: [
      { x: 416, y: 192, baseAngle: 2.38, sweep: 0.72, speed: 0.7, range: 178, fov: 0.56 },
      { x: 766, y: 266, baseAngle: 2.32, sweep: 0.76, speed: 0.65, range: 182, fov: 0.60 },
    ],
    tripwires: [],
    guards: [
      { type: 'warden', x: 546, y: 404, angle: -2.42, waypoints: [{ x: 546, y: 404 }, { x: 546, y: 214 }, { x: 274, y: 214 }, { x: 274, y: 404 }] },
      { type: 'warden', x: 142, y: 498, angle: -0.92, waypoints: [{ x: 142, y: 498 }, { x: 142, y: 210 }] },
      { type: 'warden', x: 422, y: 112, angle: 3.14, waypoints: [{ x: 422, y: 112 }, { x: 556, y: 112 }] },
      { type: 'hound', x: 696, y: 196, angle: 1.05, waypoints: [{ x: 696, y: 196 }, { x: 696, y: 452 }] },
    ],
  },

  // WING 4: THE CLOCKWORK FOUNDRY (Used in ?shot=alarm!)
  {
    id: 3, num: 4, title: 'THE CLOCKWORK FOUNDRY', par: 115,
    objective: 'Find the Sovereign Tally in the casting hall, then escape',
    spawn: { x: 66, y: 492 },
    ledger: { x: 716, y: 396, label: 'Sovereign Tally' },
    exit: { x: 46, y: 526, r: 22 },
    coins: 4, smokes: 2,
    loot: [{ x: 716, y: 74 }, { x: 84, y: 256 }, { x: 468, y: 426 }],
    carpets: [],
    lights: [
      { x: 262, y: 78, r: 84 }, { x: 468, y: 78, r: 86 }, { x: 644, y: 78, r: 84 },
      { x: 84, y: 214, r: 82 }, { x: 84, y: 368, r: 82 }, { x: 288, y: 446, r: 84 },
      { x: 718, y: 212, r: 84 }, { x: 716, y: 396, r: 88 }, { x: 168, y: 526, r: 78 }, { x: 618, y: 526, r: 78 },
    ],
    doorways: [
      { x: 72, y: 152, w: 42, h: 14 }, { x: 344, y: 182, w: 42, h: 14 },
      { x: 534, y: 80, w: 14, h: 40 }, { x: 654, y: 126, w: 42, h: 14 },
      { x: 304, y: 360, w: 42, h: 14 }, { x: 304, y: 472, w: 42, h: 14 },
    ],
    obstacles: [
      ...perimeter(),
      // 6-room foundry architectural walls
      { x: 176, y: 16, w: 20, h: 358, kind: 'wall' },
      { x: 16, y: 152, w: 56, h: 16, kind: 'wall' },
      { x: 114, y: 152, w: 62, h: 16, kind: 'wall' },
      { x: 16, y: 304, w: 160, h: 16, kind: 'wall' },
      { x: 16, y: 464, w: 288, h: 16, kind: 'wall' },
      { x: 346, y: 464, w: 72, h: 16, kind: 'wall' },
      { x: 196, y: 182, w: 148, h: 16, kind: 'wall' },
      { x: 386, y: 182, w: 162, h: 16, kind: 'wall' },
      { x: 530, y: 120, w: 20, h: 360, kind: 'wall' },
      { x: 530, y: 16, w: 20, h: 64, kind: 'wall' },
      { x: 550, y: 124, w: 104, h: 16, kind: 'wall' },
      { x: 696, y: 124, w: 108, h: 16, kind: 'wall' },
      { x: 550, y: 320, w: 72, h: 16, kind: 'wall' },
      { x: 672, y: 320, w: 132, h: 16, kind: 'wall' },
      { x: 196, y: 360, w: 108, h: 16, kind: 'wall' },
      { x: 346, y: 360, w: 184, h: 16, kind: 'wall' },
      { x: 398, y: 376, w: 20, h: 104, kind: 'wall' },
      // Casting hall crates (block sightlines)
      { x: 324, y: 32, w: 74, h: 44, kind: 'crate' },
      { x: 248, y: 230, w: 50, h: 50, kind: 'crate' },
      { x: 426, y: 230, w: 50, h: 50, kind: 'crate' },
      { x: 604, y: 184, w: 50, h: 50, kind: 'crate' },
      { x: 604, y: 382, w: 50, h: 50, kind: 'crate' },
      { x: 326, y: 506, w: 50, h: 48, kind: 'crate' },
      // Low benches (crouch to hide)
      { x: 74, y: 98, w: 54, h: 26, kind: 'low' },
      { x: 306, y: 124, w: 118, h: 24, kind: 'low' },
      { x: 254, y: 312, w: 54, h: 26, kind: 'low' },
      { x: 428, y: 312, w: 54, h: 26, kind: 'low' },
      { x: 74, y: 406, w: 54, h: 26, kind: 'low' },
      { x: 730, y: 468, w: 54, h: 26, kind: 'low' },
    ],
    cameras: [
      { x: 668, y: 168, baseAngle: 1.05, sweep: 0.72, speed: 0.75, range: 174, fov: 0.58 },
    ],
    tripwires: [
      { x1: 552, y1: 396, x2: 798, y2: 396, period: 4.4, duty: 0.65, phase: 0.2 },
    ],
    guards: [
      { type: 'captain', x: 318, y: 222, angle: 0.68, waypoints: [{ x: 318, y: 222 }, { x: 488, y: 222 }, { x: 488, y: 318 }, { x: 318, y: 318 }] },
      { type: 'warden', x: 288, y: 112, angle: 1.57, waypoints: [{ x: 228, y: 102 }, { x: 492, y: 102 }] },
      { type: 'warden', x: 642, y: 322, angle: -1.62, waypoints: [{ x: 642, y: 322 }, { x: 642, y: 170 }] },
      { type: 'hound', x: 196, y: 506, angle: 0.14, waypoints: [{ x: 140, y: 506 }, { x: 688, y: 506 }] },
    ],
  },

  // WING 5: OBSERVATORY VAULT (Grand Finale)
  {
    id: 4, num: 5, title: 'THE OBSERVATORY VAULT', par: 120,
    objective: 'Steal the Celestial Sovereign Ledger and extract to the Roof',
    spawn: { x: 410, y: 518 },
    ledger: { x: 410, y: 288, label: 'Celestial Ledger' },
    exit: { x: 410, y: 56, r: 22 },
    coins: 5, smokes: 3,
    loot: [{ x: 84, y: 84 }, { x: 736, y: 84 }, { x: 84, y: 492 }, { x: 736, y: 492 }],
    carpets: [{ x: 364, y: 44, w: 92, h: 488 }, { x: 70, y: 244, w: 680, h: 88 }],
    lights: [{ x: 410, y: 288, r: 112 }, { x: 172, y: 142, r: 88 }, { x: 648, y: 142, r: 88 }, { x: 172, y: 432, r: 88 }, { x: 648, y: 432, r: 88 }],
    doorways: [{ x: 238, y: 266, w: 14, h: 44 }, { x: 568, y: 266, w: 14, h: 44 }],
    obstacles: [
      ...perimeter(),
      { x: 236, y: 148, w: 18, h: 118, kind: 'wall' },
      { x: 236, y: 310, w: 18, h: 118, kind: 'wall' },
      { x: 566, y: 148, w: 18, h: 118, kind: 'wall' },
      { x: 566, y: 310, w: 18, h: 118, kind: 'wall' },
      { x: 294, y: 184, w: 50, h: 50, kind: 'crate' },
      { x: 476, y: 184, w: 50, h: 50, kind: 'crate' },
      { x: 294, y: 342, w: 50, h: 50, kind: 'crate' },
      { x: 476, y: 342, w: 50, h: 50, kind: 'crate' },
      { x: 96, y: 266, w: 62, h: 28, kind: 'low' },
      { x: 662, y: 266, w: 62, h: 28, kind: 'low' },
      { x: 378, y: 438, w: 64, h: 26, kind: 'low' },
    ],
    cameras: [
      { x: 254, y: 158, baseAngle: 0.78, sweep: 0.65, speed: 0.78, range: 180, fov: 0.56 },
      { x: 566, y: 418, baseAngle: -2.35, sweep: 0.65, speed: 0.78, range: 180, fov: 0.56 },
    ],
    tripwires: [
      { x1: 254, y1: 148, x2: 566, y2: 148, period: 4.8, duty: 0.55, phase: 0 },
    ],
    guards: [
      { type: 'captain', x: 286, y: 112, angle: 0, waypoints: [{ x: 278, y: 112 }, { x: 542, y: 112 }] },
      { type: 'captain', x: 534, y: 444, angle: 3.14, waypoints: [{ x: 542, y: 444 }, { x: 278, y: 444 }] },
      { type: 'hound', x: 148, y: 196, angle: 1.57, waypoints: [{ x: 148, y: 112 }, { x: 148, y: 462 }] },
      { type: 'hound', x: 672, y: 384, angle: -1.57, waypoints: [{ x: 672, y: 462 }, { x: 672, y: 112 }] },
    ],
  },
];
