# Chess Trainer

A post-game review and learning tool: recreate a game by clicking, let Stockfish
evaluate every position, and see where the game turned.

## Run it

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

| Folder | Layer | Status |
|---|---|---|
| `src/lib/chess/` | Board and rules (chess.js wrapper) | FEN validation |
| `src/lib/engine/` | Stockfish worker wrapper, UCI parsing | Milestone 2 |
| `src/lib/review/` | Move classification | Milestone 5 |
| `src/components/board/` | Board UI (react-chessboard behind `ChessBoard`) | Static board |
| `public/engine/` | Stockfish WASM files | Milestone 2 |
| `src/data/openings/` | Opening trees (King's Gambit) | Later |

Rule: only `src/components/board/ChessBoard.tsx` imports react-chessboard, and
only `src/lib/chess/` imports chess.js. Everything else uses our own types.

## Milestones

- [x] 1. Foundation: project runs, board renders from a FEN
- [ ] 2. Engine spike: Stockfish WASM in a Web Worker
- [ ] 3. Click interaction and rules
- [ ] 4. History and navigation
- [ ] 5. Live analysis and review
