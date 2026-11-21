[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# VELVET CURFEW

An original Art-Deco 2.5D top-down tactical stealth heist game across five interconnected multi-room museum wings — built in plain ES modules, HTML5 Canvas, and procedural Web Audio API with zero build step and zero external requests.

## Five Multi-Room Museum Wings
1. **The Meridian Rotunda** — Fluted pillars, chandelier pools, and your first Brass-Eye camera.
2. **The Meridian Archive** — Interconnected counting-house vaults and crimson carpet halls.
3. **The Glass Conservatory** — Transparent glasshouse walls, low-cover botanical planters, and twin Brass-Eye sweeps.
4. **The Clockwork Foundry** — Six-room casting complex guarded by a pulsing crimson laser tripwire and rallying captains.
5. **The Observatory Vault** — Final sanctum heist with twin cameras, laser gates, and Bell Hound patrols.

## Core Stealth Mechanics
- **True 2D Raycast Visibility Cones (`game/js/vision.js`)**: Every Lantern Warden, Night Captain, Bell Hound, and sweeping Brass-Eye camera casts rays against tall walls, mahogany crates, and Velvet Smoke clouds — while glasshouse partitions and low crouch-cover planters preserve realistic sightlines.
- **4-State Escalation & Recovery (`game/js/patrol.js`)**: `HIDDEN` → `SUSPICIOUS ?` (coin lures & `"WHAT WAS THAT?"`) → `ALARM !` (crimson shockwaves & `"ANSWERING ALARM"` neighbor rallies) → `SEARCHING` (orange sweep over `✕ LAST SEEN` while you slip back into cover).
- **Light, Shadow, Low Cover & Gadgets (`game/js/detection.js`)**: Crouch (`SHIFT`) in shadow bays or emerald planters to vanish; toss Brass Coins (`LMB`/`SPACE`) to split sightlines; deploy Velvet Smoke (`Q`) to slice vision cones on demand.
- **Between-Wing Stealth Perks & Procedural Audio (`game/js/audio.js`)**: Unlock perks between wings (*Felt Soles*, *Brass Resonator*, *Nightshade Veil*, and 6 more) backed by a synthesized Web Audio noir soundscape.

## Controls
- `WASD` / `Arrows` — Move
- `SHIFT` — Shadow Crouch (hide in low cover / silent footsteps)
- `LMB` / `SPACE` — Toss Brass Coin Lure
- `Q` — Deploy Velvet Smoke
- `E` — Loot / Toggle Hide Stance
- `P` — Pause · `M` — Mute · `R` — Restart Wing

## Run Locally
```bash
node serve.ts
# Open http://localhost:8080
```
