// Copies the Stockfish engine files from node_modules into public/engine so
// Next.js serves them as static files. Runs automatically after `npm install`
// (see "postinstall" in package.json). The files are git-ignored, so only the
// stockfish version in package.json is tracked, not the 1.8 MB binaries.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "stockfish", "bin");
const to = join(root, "public", "engine");

mkdirSync(to, { recursive: true });
for (const file of ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"]) {
  copyFileSync(join(from, file), join(to, file));
  console.log(`copied ${file} -> public/engine/`);
}

// Stockfish is GPL-3.0: the licence text travels with the engine files we serve.
copyFileSync(join(root, "node_modules", "stockfish", "Copying.txt"), join(to, "COPYING.txt"));
console.log("copied Copying.txt -> public/engine/COPYING.txt");
