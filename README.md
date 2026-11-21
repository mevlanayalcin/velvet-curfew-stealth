[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# VELVET CURFEW

An original 1920s Art-Deco 2.5D top-down tactical stealth heist across five grand museum wings — authored in plain ES modules, HTML5 Canvas, and procedural Web Audio API with zero build step and zero external requests.

## Five Art-Deco Grand Museum Wings
1. **Wing I: Grand Rotunda** — Chevron marble parquet, crimson velvet runners, octagonal ivory columns, and gilded vitrines.
2. **Wing II: Velvet Promenade** — Tufted crimson gallery settees, bronze folding screens, and sweeping laser beams guarding the Star Sapphire.
3. **Wing III: Vault Vestibule** — High-tension escape corridors engineered for Velvet Smoke Veil sightline breaks.
4. **Wing IV: Sapphire Hall** — Dual Brass-Eye camera domes and intersecting inspector lanes.
5. **Wing V: Observatory Penthouse** — The culminating heist for the Crown Sapphire and roof Brass Elevator.

## Core Stealth Mechanics
- **True 2D Raycast Sightlines (`game/js/vision.js`)**: Lantern cones from Night Curators, Gallery Docents, Chief Inspectors, and Brass-Eye security domes cast pixel-accurate rays against brass-inlaid masonry walls, octagonal marble columns, gilded mahogany glass vitrines, ornate bronze screens, and drifting Velvet Smoke Veil clouds.
- **4-State Curfew Escalation (`game/js/patrol.js`)**: `UNSEEN` → `CURIOUS · ?` (Brass Coin Lure `CLINK!` & `FOOTSTEP?`) → `CURFEW BREACH · !` (`CURFEW BELL!` convergence) → `SWEEPING` (translucent ghost silhouette at `LAST GLIMPSE`).
- **Art-Deco Cover & Gadgets (`game/js/detection.js`)**: Crouch (`SHIFT`) behind tufted crimson velvet settees or inside stanchion rope `SHADOW ALCOVE`s; toss Brass Coin Lures (`Q`/`LMB`) with curved golden trajectories; deploy Violet-Silver Velvet Smoke Veils (`E`) to sever vision cones.
- **Golden Infiltration Debrief (`game/js/render.js`, `game/js/ui.js`)**: Upon reaching the Brass Elevator, review your Ghost Rating (`S/A/B`) alongside your dashed golden infiltration path across the completed museum wing.

## Controls
- `WASD` / `Arrows` — Move
- `SHIFT` — Crouch (conceal behind velvet settees & silent step)
- `Q` / `LMB` / `SPACE` — Toss Brass Coin Lure
- `E` — Release Velvet Smoke Veil
- `F` — Loot / Toggle Crouch
- `P` — Pause · `M` — Mute · `R` — Restart Wing

## Run Locally
```bash
node serve.ts
# Open http://localhost:8080
```
