[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# VELVET CURFEW

An original 1920s Art-Deco 2.5D top-down tactical stealth heist across five grand museum wings — authored in plain ES modules, HTML5 Canvas, and procedural Web Audio API with zero build step and zero external requests.

## Five Art-Deco Grand Museum Wings
1. **Wing I: Grand Rotunda** — Chevron marble parquet, crimson velvet runners, octagonal ivory columns, and gilded vitrines.
2. **Wing II: Velvet Promenade** — Tufted crimson gallery settees, bronze folding screens, and sweeping laser beams guarding The Solis Opal.
3. **Wing III: Vault Vestibule** — High-tension escape corridors engineered for Velvet Smoke Veil sightline breaks.
4. **Wing IV: Opal Hall** — Dual Brass-Eye camera domes and intersecting inspector lanes.
5. **Wing V: Observatory Penthouse** — The culminating heist for The Solis Opal and roof Brass Elevator.

## Core Stealth Mechanics
- **True 2D Raycast Sightlines (`game/js/vision.js`)**: Lantern cones from Night Curators, Gallery Docents, Chief Inspectors, and Brass-Eye security domes cast pixel-accurate rays against brass-inlaid masonry walls, octagonal marble columns, gilded mahogany glass vitrines, ornate bronze screens, and drifting Velvet Smoke Veil clouds.
- **3 Active Stealth Gadgets + Light Manipulation (`game/js/detection.js`)**:
  - **`[Q]` / `LMB` Coin Lure**: Toss brass coins along a curved golden arc (`CLINK!`) to pull curators off sightlines (`FOOTSTEP?`).
  - **`[E]` Velvet Veil**: Release a billowing violet-silver smoke cloud that physically slices vision cones.
  - **`[R]` Douse Lamp**: Extinguish nearby Art-Deco brass sconces to plunge 150px warm pools into `DEEP SHADOW` sanctuaries (`DARKENED LAMP?`).
  - **`[V]` Brass Vent**: Slip silently through linked subfloor brass floor grates underneath walls and laser tripwires.
- **Through-Wall Guard Footstep Sonar (`game/js/patrol.js`, `game/js/audio.js`)**: Moving curators emit directional stereo footsteps and visible expanding acoustic sonar rings (`STEP`) through masonry walls to telegraph approaching patrols.
- **4-State Escalation & Live Per-Curator Telemetry (`game/js/patrol.js`, `game/js/ui.js`)**: Track every curator's real-time AI state (`PATROL`, `CURIOUS ?`, `SWEEPING`, `BREACH !`) and suspicion bar alongside live wing objectives.
- **Golden Infiltration Debrief (`game/js/render.js`)**: Upon boarding the Brass Elevator, inspect your `GHOST RATING: S` ledger paired with your dashed golden infiltration path across the museum floorplan.

## Controls
- `WASD` / `Arrows` — Move
- `SHIFT` — Crouch (conceal behind velvet settees & silent step)
- `Q` / `LMB` / `SPACE` — Toss Brass Coin Lure
- `E` — Release Velvet Smoke Veil
- `R` — Douse Nearby Brass Sconce
- `F` — Loot / Toggle Crouch
- `P` — Pause · `M` — Mute · `X` — Restart Wing

## Run Locally
```bash
node serve.ts
# Open http://localhost:8080
```
