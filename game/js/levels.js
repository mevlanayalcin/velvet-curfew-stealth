// Velvet Curfew v2b — 5 100% Original 1920s Art-Deco Grand Museum Wings (820x576)
// Architectural Props: stepped brass walls ('wall'), octagonal ivory-marble columns ('column'),
// gilded mahogany & glass display vitrines ('vitrine'), ornate bronze Art-Deco folding screens ('screen'),
// tufted crimson velvet gallery settees ('settee' — low crouch-hide cover), and stanchion shadow alcoves ('alcove').

export const STAGE_W = 820;
export const STAGE_H = 576;

export const GUARD_TYPES = {
  curator: {
    id: 'curator', name: 'Night Curator',
    speed: 60, chaseSpeed: 106, visionRange: 196, fov: 0.72, hearMult: 1.0, suspicionRate: 0.85,
    cloak: '#e2b253', trim: '#f8efe0',
  },
  docent: {
    id: 'docent', name: 'Gallery Docent',
    speed: 80, chaseSpeed: 124, visionRange: 162, fov: 0.64, hearMult: 1.45, suspicionRate: 0.96,
    cloak: '#e87948', trim: '#ffedd5',
  },
  inspector: {
    id: 'inspector', name: 'Chief Inspector',
    speed: 58, chaseSpeed: 116, visionRange: 214, fov: 0.86, hearMult: 1.15, suspicionRate: 1.12,
    cloak: '#e11d48', trim: '#ffe4e6',
  },
};

export const PERKS = [
  { id: 'felt-soles', name: 'Felt Soles', tag: 'ACOUSTIC', desc: '-45% marble footstep noise & +15% crouch speed.', apply: (m) => { m.noiseMult *= 0.55; m.crouchSpeedMult *= 1.15; } },
  { id: 'brass-resonator', name: 'Brass Resonator', tag: 'LURE', desc: '+2 Coin Lures, +35% ripple reach & longer curiosity.', apply: (m) => { m.bonusCoins += 2; m.lureRadiusMult *= 1.35; m.lureHoldBonus += 2.0; } },
  { id: 'velvet-cowl', name: 'Velvet Cowl', tag: 'SHADOW', desc: 'Alcove concealment lingers 1.5s & +1 Velvet Veil.', apply: (m) => { m.shadowLinger += 1.5; m.bonusVeils += 1; } },
  { id: 'iris-incense', name: 'Iris Incense', tag: 'VEIL', desc: '+30% Velvet Smoke Veil radius & +3s duration.', apply: (m) => { m.smokeRadiusMult *= 1.3; m.smokeDurationBonus += 3.0; } },
  { id: 'skeleton-key', name: 'Skeleton Key', tag: 'HEIST', desc: 'Wider relic reach & +25% Ghost Bonus multiplier.', apply: (m) => { m.lootRangeBonus += 16; m.scoreMult *= 1.25; } },
  { id: 'silk-gloves', name: 'Silk Gloves', tag: 'AGILITY', desc: '+18% coin toss arc & +12% velvet glide speed.', apply: (m) => { m.throwRangeMult *= 1.18; m.speedMult *= 1.12; } },
];

function perimeter() {
  return [
    { x: 0, y: 0, w: STAGE_W, h: 16, kind: 'wall' },
    { x: 0, y: STAGE_H - 16, w: STAGE_W, h: 16, kind: 'wall' },
    { x: 0, y: 16, w: 16, h: STAGE_H - 32, kind: 'wall' },
    { x: STAGE_W - 16, y: 16, w: 16, h: STAGE_H - 32, kind: 'wall' },
  ];
}

export const WINGS = [
  // WING I: GRAND ROTUNDA (Hero Cover 01-rotunda.jpg + Debrief Trail 04-debrief.jpg!)
  {
    id: 0, roman: 'I', title: 'GRAND ROTUNDA', par: 95,
    objective: 'Slip unseen to the Star Sapphire vitrine, then board the Brass Elevator',
    spawn: { x: 74, y: 492 },
    sapphire: { x: 410, y: 288, label: 'Star Sapphire' },
    elevator: { x: 748, y: 74, r: 24 },
    coins: 4, veils: 2,
    relics: [{ x: 102, y: 88 }, { x: 726, y: 494 }, { x: 410, y: 84 }],
    rotunda: { x: 410, y: 288, r: 108 },
    carpets: [
      { x: 356, y: 38, w: 108, h: 500 },
      { x: 54, y: 238, w: 712, h: 100 },
    ],
    lights: [
      { x: 410, y: 288, r: 112 },
      { x: 194, y: 132, r: 90 },
      { x: 628, y: 132, r: 90 },
      { x: 194, y: 444, r: 88 },
      { x: 628, y: 444, r: 90 },
    ],
    alcoves: [
      { x: 26, y: 418, w: 108, h: 126 },
      { x: 26, y: 184, w: 94, h: 112 },
      { x: 242, y: 454, w: 104, h: 92 },
      { x: 476, y: 32, w: 112, h: 88 },
      { x: 684, y: 222, w: 110, h: 126 },
    ],
    arches: [
      { x: 214, y: 162, w: 66, h: 18, orient: 'h' },
      { x: 540, y: 162, w: 66, h: 18, orient: 'h' },
      { x: 214, y: 394, w: 66, h: 18, orient: 'h' },
      { x: 540, y: 394, w: 66, h: 18, orient: 'h' },
    ],
    obstacles: [
      ...perimeter(),
      // Stepped Art-Deco brass-trimmed gallery partitions with curved archways
      { x: 16, y: 162, w: 198, h: 18, kind: 'wall' },
      { x: 280, y: 162, w: 64, h: 18, kind: 'wall' },
      { x: 476, y: 162, w: 64, h: 18, kind: 'wall' },
      { x: 606, y: 162, w: 198, h: 18, kind: 'wall' },
      { x: 16, y: 394, w: 198, h: 18, kind: 'wall' },
      { x: 606, y: 394, w: 198, h: 18, kind: 'wall' },
      // Octagonal fluted ivory-marble atrium columns around the rotunda
      { x: 282, y: 204, w: 46, h: 46, kind: 'column' },
      { x: 492, y: 204, w: 46, h: 46, kind: 'column' },
      { x: 282, y: 326, w: 46, h: 46, kind: 'column' },
      { x: 492, y: 326, w: 46, h: 46, kind: 'column' },
      // Gilded mahogany & glass display vitrines (sight blockers)
      { x: 122, y: 256, w: 72, h: 32, kind: 'vitrine' },
      { x: 626, y: 256, w: 72, h: 32, kind: 'vitrine' },
      { x: 358, y: 454, w: 104, h: 30, kind: 'vitrine' },
      // Ornate bronze Art-Deco folding screens (sight blockers)
      { x: 146, y: 432, w: 22, h: 82, kind: 'screen' },
      { x: 652, y: 432, w: 22, h: 82, kind: 'screen' },
      // Tufted crimson velvet gallery settees (low crouch-hide cover)
      { x: 194, y: 334, w: 64, h: 28, kind: 'settee' },
      { x: 562, y: 334, w: 64, h: 28, kind: 'settee' },
      { x: 132, y: 92, w: 66, h: 28, kind: 'settee' },
      { x: 620, y: 92, w: 66, h: 28, kind: 'settee' },
    ],
    cameras: [
      { x: 786, y: 204, baseAngle: 2.52, sweep: 0.62, speed: 0.65, range: 192, fov: 0.56 },
    ],
    tripwires: [
      { x1: 476, y1: 180, x2: 476, y2: 206, period: 4.5, duty: 0.62, phase: 0.1 },
    ],
    guards: [
      { type: 'curator', x: 356, y: 378, angle: -2.42, waypoints: [{ x: 356, y: 422 }, { x: 356, y: 124 }, { x: 248, y: 124 }, { x: 248, y: 422 }] },
      { type: 'curator', x: 566, y: 288, angle: 2.94, waypoints: [{ x: 566, y: 128 }, { x: 566, y: 462 }] },
      { type: 'inspector', x: 410, y: 126, angle: 0.56, waypoints: [{ x: 284, y: 122 }, { x: 568, y: 122 }] },
    ],
  },

  // WING II: VELVET PROMENADE (Used in 02-lure.jpg — CURIOUS · ? Brass Coin Lure + Laser Tripwire!)
  {
    id: 1, roman: 'II', title: 'VELVET PROMENADE', par: 105,
    objective: 'Lure curators off the crimson promenade and claim the Star Sapphire',
    spawn: { x: 80, y: 492 },
    sapphire: { x: 676, y: 288, label: 'Star Sapphire' },
    elevator: { x: 748, y: 72, r: 24 },
    coins: 4, veils: 2,
    relics: [{ x: 104, y: 86 }, { x: 426, y: 506 }, { x: 676, y: 494 }],
    rotunda: { x: 410, y: 288, r: 78 },
    carpets: [
      { x: 50, y: 240, w: 716, h: 96 },
      { x: 364, y: 42, w: 92, h: 492 },
    ],
    lights: [
      { x: 210, y: 288, r: 98 },
      { x: 410, y: 288, r: 104 },
      { x: 644, y: 288, r: 96 },
      { x: 204, y: 108, r: 84 },
      { x: 616, y: 468, r: 88 },
    ],
    alcoves: [
      { x: 26, y: 420, w: 112, h: 124 },
      { x: 214, y: 374, w: 120, h: 96 },
      { x: 26, y: 162, w: 92, h: 104 },
      { x: 466, y: 34, w: 116, h: 96 },
      { x: 486, y: 432, w: 112, h: 104 },
    ],
    arches: [
      { x: 166, y: 158, w: 62, h: 18, orient: 'h' },
      { x: 562, y: 158, w: 62, h: 18, orient: 'h' },
      { x: 562, y: 400, w: 62, h: 18, orient: 'h' },
      { x: 544, y: 256, w: 18, h: 64, orient: 'v' },
    ],
    obstacles: [
      ...perimeter(),
      // Stepped promenade masonry wings + inner Sapphire Vault alcove
      { x: 16, y: 158, w: 150, h: 18, kind: 'wall' },
      { x: 228, y: 158, w: 120, h: 18, kind: 'wall' },
      { x: 472, y: 158, w: 90, h: 18, kind: 'wall' },
      { x: 624, y: 158, w: 180, h: 18, kind: 'wall' },
      { x: 544, y: 176, w: 18, h: 80, kind: 'wall' },
      { x: 544, y: 320, w: 18, h: 80, kind: 'wall' },
      { x: 472, y: 400, w: 90, h: 18, kind: 'wall' },
      { x: 624, y: 400, w: 180, h: 18, kind: 'wall' },
      // Octagonal marble columns & gilded vitrines
      { x: 262, y: 200, w: 46, h: 46, kind: 'column' },
      { x: 262, y: 332, w: 46, h: 46, kind: 'column' },
      { x: 446, y: 200, w: 64, h: 32, kind: 'vitrine' },
      { x: 446, y: 342, w: 64, h: 32, kind: 'vitrine' },
      { x: 122, y: 260, w: 68, h: 32, kind: 'vitrine' },
      // Ornate bronze Art-Deco folding screens
      { x: 190, y: 382, w: 22, h: 78, kind: 'screen' },
      { x: 356, y: 438, w: 22, h: 76, kind: 'screen' },
      // Tufted crimson velvet settees (low cover)
      { x: 226, y: 418, w: 72, h: 28, kind: 'settee' },
      { x: 374, y: 102, w: 72, h: 28, kind: 'settee' },
      { x: 620, y: 464, w: 72, h: 28, kind: 'settee' },
    ],
    cameras: [
      { x: 788, y: 204, baseAngle: 2.48, sweep: 0.65, speed: 0.72, range: 195, fov: 0.58 },
    ],
    tripwires: [
      { x1: 562, y1: 242, x2: 798, y2: 242, period: 4.4, duty: 0.64, phase: 0.1 },
    ],
    guards: [
      { type: 'curator', x: 368, y: 286, angle: 2.38, waypoints: [{ x: 368, y: 122 }, { x: 368, y: 460 }] },
      { type: 'docent', x: 222, y: 112, angle: 0.25, waypoints: [{ x: 124, y: 108 }, { x: 520, y: 108 }] },
      { type: 'curator', x: 642, y: 356, angle: 2.95, waypoints: [{ x: 604, y: 356 }, { x: 756, y: 356 }] },
      { type: 'inspector', x: 526, y: 484, angle: 3.14, waypoints: [{ x: 430, y: 484 }, { x: 744, y: 484 }] },
    ],
  },

  // WING III: VAULT VESTIBULE (Used in 03-breach.jpg — CURFEW BREACH · ! / Velvet Smoke Veil / LAST GLIMPSE!)
  {
    id: 2, roman: 'III', title: 'VAULT VESTIBULE', par: 110,
    objective: 'Break sightlines with Velvet Veil and reach the Brass Elevator',
    spawn: { x: 72, y: 492 },
    sapphire: { x: 236, y: 288, label: 'Star Sapphire' },
    elevator: { x: 746, y: 288, r: 24 },
    coins: 4, veils: 3,
    relics: [{ x: 96, y: 84 }, { x: 416, y: 84 }, { x: 416, y: 492 }],
    rotunda: { x: 410, y: 288, r: 92 },
    carpets: [
      { x: 48, y: 242, w: 720, h: 92 },
      { x: 366, y: 42, w: 88, h: 492 },
    ],
    lights: [
      { x: 236, y: 288, r: 100 },
      { x: 410, y: 288, r: 106 },
      { x: 604, y: 288, r: 96 },
      { x: 246, y: 96, r: 86 },
      { x: 580, y: 480, r: 86 },
    ],
    alcoves: [
      { x: 26, y: 426, w: 104, h: 116 },
      { x: 526, y: 34, w: 114, h: 92 },
      { x: 510, y: 176, w: 104, h: 74 },
      { x: 222, y: 446, w: 112, h: 94 },
    ],
    arches: [
      { x: 162, y: 164, w: 18, h: 62, orient: 'v' },
      { x: 380, y: 158, w: 62, h: 18, orient: 'h' },
      { x: 380, y: 400, w: 62, h: 18, orient: 'h' },
      { x: 632, y: 164, w: 18, h: 62, orient: 'v' },
      { x: 632, y: 350, w: 18, h: 62, orient: 'v' },
    ],
    obstacles: [
      ...perimeter(),
      // Vault Vestibule stepped gallery walls
      { x: 162, y: 16, w: 18, h: 148, kind: 'wall' },
      { x: 162, y: 350, w: 18, h: 210, kind: 'wall' },
      { x: 180, y: 158, w: 200, h: 18, kind: 'wall' },
      { x: 442, y: 158, w: 190, h: 18, kind: 'wall' },
      { x: 180, y: 400, w: 200, h: 18, kind: 'wall' },
      { x: 442, y: 400, w: 190, h: 18, kind: 'wall' },
      { x: 632, y: 16, w: 18, h: 148, kind: 'wall' },
      { x: 632, y: 412, w: 18, h: 148, kind: 'wall' },
      // Columns, vitrines & folding screens across the vestibule corridor
      { x: 304, y: 206, w: 44, h: 44, kind: 'column' },
      { x: 304, y: 326, w: 44, h: 44, kind: 'column' },
      { x: 492, y: 206, w: 44, h: 44, kind: 'column' },
      { x: 492, y: 326, w: 44, h: 44, kind: 'column' },
      { x: 244, y: 78, w: 86, h: 30, kind: 'vitrine' },
      { x: 490, y: 468, w: 86, h: 30, kind: 'vitrine' },
      { x: 562, y: 198, w: 22, h: 62, kind: 'screen' },
      // Tufted crimson settees
      { x: 554, y: 344, w: 64, h: 28, kind: 'settee' },
      { x: 84, y: 274, w: 54, h: 28, kind: 'settee' },
      { x: 690, y: 102, w: 66, h: 28, kind: 'settee' },
    ],
    cameras: [
      { x: 648, y: 166, baseAngle: 2.35, sweep: 0.65, speed: 0.78, range: 175, fov: 0.56 },
    ],
    tripwires: [
      { x1: 650, y1: 418, x2: 800, y2: 418, period: 4.2, duty: 0.62, phase: 0.2 },
    ],
    guards: [
      { type: 'inspector', x: 284, y: 284, angle: 0.08, waypoints: [{ x: 242, y: 284 }, { x: 558, y: 284 }] },
      { type: 'docent', x: 412, y: 112, angle: 1.54, waypoints: [{ x: 230, y: 116 }, { x: 590, y: 116 }] },
      { type: 'curator', x: 412, y: 462, angle: -1.48, waypoints: [{ x: 240, y: 462 }, { x: 580, y: 462 }] },
      { type: 'docent', x: 706, y: 472, angle: -1.6, waypoints: [{ x: 706, y: 494 }, { x: 706, y: 120 }] },
    ],
  },

  // WING IV: SAPPHIRE HALL
  {
    id: 3, roman: 'IV', title: 'SAPPHIRE HALL', par: 115,
    objective: 'Cross twin laser corridors, steal the Star Sapphire & ascend',
    spawn: { x: 74, y: 74 },
    sapphire: { x: 726, y: 492, label: 'Star Sapphire' },
    elevator: { x: 74, y: 502, r: 24 },
    coins: 5, veils: 3,
    relics: [{ x: 726, y: 82 }, { x: 410, y: 288 }, { x: 246, y: 492 }],
    rotunda: { x: 410, y: 288, r: 80 },
    carpets: [{ x: 48, y: 246, w: 724, h: 84 }, { x: 368, y: 44, w: 84, h: 488 }],
    lights: [{ x: 410, y: 288, r: 108 }, { x: 186, y: 150, r: 86 }, { x: 634, y: 150, r: 86 }, { x: 186, y: 426, r: 86 }, { x: 634, y: 426, r: 86 }],
    alcoves: [{ x: 24, y: 24, w: 108, h: 108 }, { x: 24, y: 234, w: 94, h: 108 }, { x: 696, y: 234, w: 98, h: 108 }],
    arches: [{ x: 378, y: 162, w: 64, h: 18, orient: 'h' }, { x: 378, y: 396, w: 64, h: 18, orient: 'h' }],
    obstacles: [
      ...perimeter(),
      { x: 160, y: 162, w: 218, h: 18, kind: 'wall' },
      { x: 442, y: 162, w: 218, h: 18, kind: 'wall' },
      { x: 160, y: 396, w: 218, h: 18, kind: 'wall' },
      { x: 442, y: 396, w: 218, h: 18, kind: 'wall' },
      { x: 256, y: 260, w: 46, h: 46, kind: 'column' },
      { x: 518, y: 260, w: 46, h: 46, kind: 'column' },
      { x: 360, y: 74, w: 100, h: 30, kind: 'vitrine' },
      { x: 360, y: 472, w: 100, h: 30, kind: 'vitrine' },
      { x: 162, y: 268, w: 66, h: 28, kind: 'settee' },
      { x: 592, y: 268, w: 66, h: 28, kind: 'settee' },
    ],
    cameras: [
      { x: 180, y: 180, baseAngle: 0.78, sweep: 0.62, speed: 0.76, range: 182, fov: 0.56 },
      { x: 640, y: 396, baseAngle: -2.35, sweep: 0.62, speed: 0.76, range: 182, fov: 0.56 },
    ],
    tripwires: [{ x1: 660, y1: 396, x2: 800, y2: 396, period: 4.0, duty: 0.6, phase: 0 }],
    guards: [
      { type: 'inspector', x: 260, y: 112, angle: 0, waypoints: [{ x: 180, y: 112 }, { x: 640, y: 112 }] },
      { type: 'inspector', x: 560, y: 454, angle: 3.14, waypoints: [{ x: 640, y: 454 }, { x: 180, y: 454 }] },
      { type: 'docent', x: 410, y: 288, angle: 0, waypoints: [{ x: 124, y: 288 }, { x: 696, y: 288 }] },
    ],
  },

  // WING V: OBSERVATORY PENTHOUSE
  {
    id: 4, roman: 'V', title: 'OBSERVATORY PENTHOUSE', par: 120,
    objective: 'Outwit the Chief Inspectors and escape with the Crown Sapphire',
    spawn: { x: 410, y: 514 },
    sapphire: { x: 410, y: 288, label: 'Crown Sapphire' },
    elevator: { x: 410, y: 58, r: 24 },
    coins: 5, veils: 3,
    relics: [{ x: 84, y: 84 }, { x: 736, y: 84 }, { x: 84, y: 492 }, { x: 736, y: 492 }],
    rotunda: { x: 410, y: 288, r: 102 },
    carpets: [{ x: 364, y: 44, w: 92, h: 488 }, { x: 62, y: 244, w: 696, h: 88 }],
    lights: [{ x: 410, y: 288, r: 114 }, { x: 176, y: 144, r: 88 }, { x: 644, y: 144, r: 88 }, { x: 176, y: 432, r: 88 }, { x: 644, y: 432, r: 88 }],
    alcoves: [{ x: 342, y: 458, w: 136, h: 90 }, { x: 26, y: 230, w: 96, h: 116 }, { x: 698, y: 230, w: 96, h: 116 }],
    arches: [{ x: 230, y: 258, w: 18, h: 60, orient: 'v' }, { x: 572, y: 258, w: 18, h: 60, orient: 'v' }],
    obstacles: [
      ...perimeter(),
      { x: 230, y: 144, w: 18, h: 114, kind: 'wall' },
      { x: 230, y: 318, w: 18, h: 114, kind: 'wall' },
      { x: 572, y: 144, w: 18, h: 114, kind: 'wall' },
      { x: 572, y: 318, w: 18, h: 114, kind: 'wall' },
      { x: 292, y: 188, w: 46, h: 46, kind: 'column' },
      { x: 482, y: 188, w: 46, h: 46, kind: 'column' },
      { x: 292, y: 342, w: 46, h: 46, kind: 'column' },
      { x: 482, y: 342, w: 46, h: 46, kind: 'column' },
      { x: 110, y: 274, w: 66, h: 28, kind: 'settee' },
      { x: 644, y: 274, w: 66, h: 28, kind: 'settee' },
      { x: 374, y: 422, w: 72, h: 28, kind: 'settee' },
    ],
    cameras: [
      { x: 248, y: 158, baseAngle: 0.78, sweep: 0.65, speed: 0.8, range: 186, fov: 0.56 },
      { x: 572, y: 418, baseAngle: -2.35, sweep: 0.65, speed: 0.8, range: 186, fov: 0.56 },
    ],
    tripwires: [{ x1: 248, y1: 146, x2: 572, y2: 146, period: 4.4, duty: 0.58, phase: 0 }],
    guards: [
      { type: 'inspector', x: 280, y: 108, angle: 0, waypoints: [{ x: 266, y: 108 }, { x: 554, y: 108 }] },
      { type: 'inspector', x: 540, y: 452, angle: 3.14, waypoints: [{ x: 554, y: 452 }, { x: 266, y: 452 }] },
      { type: 'docent', x: 146, y: 190, angle: 1.57, waypoints: [{ x: 146, y: 106 }, { x: 146, y: 470 }] },
      { type: 'docent', x: 674, y: 388, angle: -1.57, waypoints: [{ x: 674, y: 470 }, { x: 674, y: 106 }] },
    ],
  },
];
