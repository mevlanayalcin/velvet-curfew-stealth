[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mevlanayalcin/velvet-curfew-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# VELVET CURFEW

An original Art-Deco 2.5D top-down tactical stealth heist game built in plain ES modules + HTML5 Canvas + procedural Web Audio API — zero build step, zero external assets, zero network requests.

## Infiltrate Five Museum Wings
1. **Wing I: Meridian Rotunda** — Fluted marble pillars, chandelier glare, and your first Brass Coin lures.
2. **Wing II: Clockwork Archive** — Mahogany library stacks patrolled by an acutely hearing Bell Hound.
3. **Wing III: Glass Conservatory** — Moonlit crossways demanding Velvet Smoke chains.
4. **Wing IV: Velvet Gallery** — Twin Night Captains sweeping broad portrait corridors.
5. **Wing V: Observatory Vault** — Inner sanctum heist for the Sovereign Ledger.

## Core Stealth Systems
- **True 2D Raycast Visibility Polygons (`game/js/vision.js`)**: Every guard's lantern cone casts rays against obstacle corners (`±0.0008 rad`) and active Velvet Smoke clouds for pixel-accurate occlusion behind cover.
- **Light vs. Shadow & Acoustics (`game/js/detection.js`)**: Warm chandelier pools expose your silhouette while deep indigo pockets and marble cover keep you hidden. Terrazzo marble amplifies footsteps compared to crimson velvet runners.
- **Guard AI & Near-Miss Recovery (`game/js/patrol.js`)**: Three distinct archetypes (`Lantern Warden`, `Bell Hound`, `Night Captain`) transition smoothly through `PATROL → SUSPICIOUS (?) → ALERT (!) → SEARCH → RECOVERY`. Escaping a high-suspicion sweep awards a Ghost Recovery bonus.
- **Between-Wing Stealth Perk Draft**: Pick 1 of 3 tactical perks between museum wings (*Felt Soles*, *Brass Resonator*, *Nightshade Veil*, and 9 more).
- **Procedural Noir Audio (`game/js/audio.js`)**: Synthesized ambient drone, marble vs. velvet footsteps, brass coin chimes, smoke hiss, suspicion stings, proximity heartbeat, and extraction chords.

## Controls
- `WASD` / `Arrows` — Move
- `SHIFT` — Shadow Crouch
- `LMB` / `SPACE` — Toss Brass Coin Lure
- `E` — Loot / Toggle Hide Stance
- `Q` — Deploy Velvet Smoke
- `P` — Pause · `M` — Mute Sound · `R` — Restart Wing

## Run Locally
```bash
node serve.ts
# Open http://localhost:8080
```
