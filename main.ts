// Velvet Curfew — Static Packaging & Dossier Entrypoint (Node 22, stdlib only)
// Copies game/ and screenshots/ into MAKEFUN_OUTPUT_DIR (or /output), validates
// required entry assets, and emits deterministic dossier.json via vendor/makefun-game.ts.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const REQUIRED_SHOTS = ['1-rotunda.jpg', '2-lure.jpg', '3-breach.jpg', '4-debrief.jpg'] as const;

const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function assertRequiredAssets(root: string): void {
  const indexPath = join(root, 'game', 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(`Velvet Curfew entrypoint missing: ${indexPath}`);
  }
  for (const shot of REQUIRED_SHOTS) {
    const shotPath = join(root, 'screenshots', shot);
    if (!existsSync(shotPath)) {
      throw new Error(`Velvet Curfew screenshot missing: ${shotPath}`);
    }
  }
}

function packageEntry(): void {
  assertRequiredAssets(REPO_ROOT);

  const outGame = join(OUTPUT_DIR, 'game');
  const outShots = join(OUTPUT_DIR, 'screenshots');
  mkdirSync(outShots, { recursive: true });

  cpSync(join(REPO_ROOT, 'game'), outGame, { recursive: true });
  cpSync(join(REPO_ROOT, 'screenshots'), outShots, { recursive: true });

  const dossierPayload = buildDossier(OUTPUT_DIR, GATE_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossierPayload);
}

packageEntry();
