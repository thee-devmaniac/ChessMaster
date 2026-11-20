# Chess Trainer

A chess learning app for beginners: learn the rules step by step, play a bot
that explains its moves, study openings, and review games with Stockfish to
see where they turned. Everything runs in the browser; there is no backend.

## Run it

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Page | What it is |
|---|---|
| `/` | Landing page |
| `/learn` | First steps: the rules of chess in 15 interactive steps |
| `/play` | Play the bot (five levels), with optional coach mode |
| `/openings` | Opening lessons: London System, Caro-Kann, King's Gambit |
| `/openings/[id]` | One lesson, with Learn, Explore, Predict and Practice modes |
| `/analyse` | Analysis board: recreate or import games (PGN files too), engine, review |
| `/about`, `/privacy` | Credits and licences; what the app stores |
| `/engine-spike` | Engine test page, for checking the engine on a device |

`npm install` also copies the Stockfish engine files into `public/engine/`
(see `scripts/copy-engine.mjs`).

## Settings

Copy `.env.example` to `.env.local` (on your computer) or set the same
variables in Vercel. Both are optional:

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_FEEDBACK_URL` | Your Google Form link. Shows "Send feedback" in the footer, About and Privacy pages. Hidden while empty. |
| `NEXT_PUBLIC_SOURCE_URL` | A link to this app's source code, shown on the About page. |

`NEXT_PUBLIC_` values are visible to every visitor: never put secrets in them.

## Deploy to Vercel

1. Push the project to GitHub (the `thee-devmaniac/ChessMaster` repo).
2. At vercel.com, sign in with that GitHub account, choose **Add New → Project**
   and import the repo. Vercel recognises Next.js; keep the default settings.
3. Under **Environment Variables**, add `NEXT_PUBLIC_FEEDBACK_URL`, then
   **Deploy**. `npm install` runs on Vercel, so the engine files are copied
   automatically.
4. Every later `git push` deploys again. Changing an environment variable
   needs a redeploy (Deployments → ⋯ → Redeploy).

The free Hobby plan is for personal, non-commercial use, which suits a free
pilot. Once the app earns money it needs a paid plan (Pro).

## Tests

```bash
npm test          # run once
npm run test:watch  # re-run on every save
```

## Structure

| Folder | What it holds |
|---|---|
| `src/lib/chess/` | Rules (chess.js wrapper), click-to-move, move tree, PGN files, hand-off between pages |
| `src/lib/engine/` | Stockfish worker wrapper, UCI parsing (MultiPV, time caps) |
| `src/lib/review/` | Move classification, full-game review, time-pressure analysis |
| `src/lib/bot/` | Bot levels and how the bot picks moves; bot games, take-back, PGN |
| `src/lib/coach/` | Coach mode: explaining moves, threats, verdicts |
| `src/lib/learn/` | First steps lesson content and goal checking |
| `src/lib/openings/` | Opening lesson types, builder (checks every move), Predict, Practice |
| `src/data/openings/` | The opening lessons, written as moves and explanations |
| `src/components/` | Board, analysis, play, learn, openings and layout components |
| `src/hooks/` | Engine lifecycle, live analysis, keyboard, reduced motion |
| `public/engine/` | Stockfish WASM files and its licence (copied on install) |

Rules: only `src/components/board/ChessBoard.tsx` imports react-chessboard.
chess.js is used only inside `src/lib/`: components go through our own
functions and types. Only `src/lib/engine/` talks to Stockfish.

## Milestones

- [x] 1. Foundation: project runs, board renders from a FEN
- [x] 2. Engine spike: Stockfish WASM in a Web Worker
- [x] 3. Click interaction and rules
- [x] 4. History and navigation (plus PGN import)
- [x] 5. Live analysis and review
- [x] 6. Variations: the game is a move tree; other moves become side lines
- [x] 7. King's Gambit lessons: Learn and Explore modes (`/openings/kings-gambit`)
- [x] 8. Predict (guess each move, hints in steps, engine shows why a guess fails) and Practice (app answers from the book)
- [x] 9. Look and feel (Chess Concept Showcase theme), landing page, CSS animations
- [x] 10. Time-pressure review from clock comments; several games per PGN file
- [x] 11. London System and Caro-Kann lessons; one page for every opening
- [x] 12. Play the bot, then coach mode
- [x] 13. Phones, first steps lesson, About and Privacy pages: ready for the pilot

## How the review works

For each move, the centipawn loss is the evaluation before the move (the value
of the best move) minus the evaluation after it, from the mover's point of
view. Evaluations are clamped to ±10 pawns. Thresholds live in
`src/lib/review/classify.ts`: inaccuracy ≥ 50, mistake ≥ 100, blunder ≥ 300.

## Licences

Stockfish is GPL v3. The site sends the engine to every visitor, so it
ships the licence text (`public/engine/COPYING.txt`, copied on install) and
the About page links to the engine's source code. The app talks to the
engine only through text messages in a separate worker. Whether the app's
own code must then be GPL too is a legal question: get advice before
selling it, or simply publish the source (set `NEXT_PUBLIC_SOURCE_URL`).
chess.js (BSD 2-Clause) and the other libraries are credited on `/about`.

## Adding opening lines

Each lesson is a file in `src/data/openings/` (add new ones to `index.ts`),
written as nested moves in standard notation, each with an explanation.
`playAs` says which side the learner plays; `alsoGood` lists moves that are
just as good as the lesson's move. The first entry in `next` is the main
line. Positions are computed by chess.js when the page loads, and
`npm test` fails if any move is illegal, so a typo can't slip through.

## Look and feel

The theme follows the Chess Concept Showcase project: navy background, antique
gold and arc-blue accents, Cinzel / Space Mono / EB Garamond / Space Grotesk.
Design tokens (colours, fonts) are CSS variables at the top of
`src/app/globals.css`; board colours are in `src/components/board/theme.ts`.
Fonts are loaded with `next/font/google` in `src/app/layout.tsx`, so the first
build needs an internet connection.
