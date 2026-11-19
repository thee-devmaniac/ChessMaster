# Chess Trainer

A post-game review and learning tool: recreate a game by clicking, let Stockfish
evaluate every position, and see where the game turned.

## Run it

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The engine test page is at http://localhost:3000/engine-spike.

`npm install` also copies the Stockfish engine files into `public/engine/`
(see `scripts/copy-engine.mjs`).

## Tests

```bash
npm test          # run once
npm run test:watch  # re-run on every save
```

## Structure

| Folder | Layer | Status |
|---|---|---|
| `src/lib/chess/` | Rules (chess.js wrapper), click-to-move, move tree with variations | Done (M3, M6) |
| `src/lib/engine/` | Stockfish worker wrapper, UCI parsing | Done (M2) |
| `src/lib/review/` | Move classification, full-game review | Done (M5) |
| `src/components/board/` | Board UI, highlights, promotion picker | Done (M3) |
| `public/engine/` | Stockfish WASM files (copied on install) | Done (M2) |
| `src/components/analysis/` | Evaluation bar, engine panel, review panel | Done (M5) |
| `src/hooks/` | React hooks: engine lifecycle, live analysis | Done (M5) |
| `src/lib/openings/` | Opening lesson types, builder (checks every move), navigation | Done (M7) |
| `src/data/openings/` | Authored opening lines: King's Gambit | Done (M7) |
| `src/components/openings/` | Learn, Explore, Predict and Practice modes | Done (M7, M8) |

Rule: only `src/components/board/ChessBoard.tsx` imports react-chessboard, and
only `src/lib/chess/` imports chess.js. Everything else uses our own types.

## Milestones

- [x] 1. Foundation: project runs, board renders from a FEN
- [x] 2. Engine spike: Stockfish WASM in a Web Worker
- [x] 3. Click interaction and rules
- [x] 4. History and navigation (plus PGN import)
- [x] 5. Live analysis and review
- [x] 6. Variations: the game is a move tree; other moves become side lines
- [x] 7. King's Gambit lessons: Learn and Explore modes (`/openings/kings-gambit`)
- [x] 8. Predict (guess each move, hints in steps, engine shows why a guess fails) and Practice (app answers from the book)
Rule: only `src/lib/engine/` talks to Stockfish.

## How the review works

For each move, the centipawn loss is the evaluation before the move (the value
of the best move) minus the evaluation after it, from the mover's point of
view. Evaluations are clamped to ±10 pawns. Thresholds live in
`src/lib/review/classify.ts`: inaccuracy ≥ 50, mistake ≥ 100, blunder ≥ 300.

## Licence note

Stockfish is GPL-licensed. Fine for personal use; if this app is ever
distributed, its source must be made available under the GPL too.

## Adding opening lines

Lines live in `src/data/openings/kingsGambit.ts` as nested moves in standard
notation, each with an explanation. The first entry in `next` is the main
line. Positions are computed by chess.js when the page loads, and
`npm test` fails if any move is illegal, so a typo can't slip through.
