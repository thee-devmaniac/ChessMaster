"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ChessBoard, type Orientation } from "@/components/board/ChessBoard";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { STARTING_FEN, checkFen } from "@/lib/chess/fen";
import { checkedKingSquare, importPgn, turn, type MoveInput, type PromotionPiece } from "@/lib/chess/rules";
import { describeStatus } from "@/lib/chess/describe";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { currentFen, currentStatus, newSession, recordOf, sessionReducer, type SessionAction } from "@/lib/chess/game";
import { ROOT, has, isMainLine, lineThrough } from "@/lib/chess/tree";
import { EvalBar } from "@/components/analysis/EvalBar";
import { EnginePanel } from "@/components/analysis/EnginePanel";
import { ReviewPanel, type ReviewState } from "@/components/analysis/ReviewPanel";
import type { BoardArrow } from "@/components/board/ChessBoard";
import { useStockfish } from "@/hooks/useStockfish";
import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import { AnalysisCache } from "@/lib/engine/cache";
import { StockfishEngine } from "@/lib/engine/StockfishEngine";
import { createStockfishWorker } from "@/lib/engine/createStockfishWorker";
import type { Score } from "@/lib/engine/types";
import { analyseGame, DEFAULT_REVIEW_DEPTH } from "@/lib/review/analyseGame";
import { reviewMoves, type Classification, type ReviewedMove } from "@/lib/review/classify";

const BEST_ARROW = "rgba(21, 128, 61, 0.8)"; // green: the engine's move
const PLAYED_ARROW = "rgba(200, 30, 30, 0.75)"; // red: the move played in the game

/**
 * Recreate a game, explore other moves as variations, see the engine's view of
 * every position, and review the game for mistakes.
 *
 * State:
 *  - `session` (move tree + current node), changed only through sessionReducer
 *  - `click`, the UI-only click-to-move state
 *  - `verdicts`, review results by node id (kept across reviews of different lines)
 * Engine results live in `cache`, shared by live analysis and the review.
 */
export default function Home() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => newSession());
  const [click, setClick] = useState<ClickState>(IDLE);
  const [orientation, setOrientation] = useState<Orientation>("white");
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { tree, current } = session;
  const node = tree.nodes[current];
  const fen = currentFen(session);
  const status = currentStatus(session);
  const gameOver = status.kind !== "playing";
  const onMainLine = isMainLine(tree, current);
  const hasMovesAfter = node.children.length > 0;

  // ---- Engine: one for the position on screen, one per review ----
  const [cache] = useState(() => new AnalysisCache());
  const { engine, error: engineError } = useStockfish();
  const [engineOn, setEngineOn] = useState(true);
  const live = useLiveAnalysis(engine, cache, fen, engineOn && !gameOver);

  const [review, setReview] = useState<ReviewState>({ status: "idle" });
  const [verdicts, setVerdicts] = useState<Record<string, ReviewedMove>>({});
  const [reviewDepth, setReviewDepth] = useState(DEFAULT_REVIEW_DEPTH);
  const reviewAbort = useRef<AbortController | null>(null);
  // Stop a running review if the page closes.
  useEffect(() => () => reviewAbort.current?.abort(), []);

  /** Reviews the line through the position on screen: the main line, or the variation you are in. */
  async function startReview() {
    reviewAbort.current?.abort();
    const controller = new AbortController();
    reviewAbort.current = controller;
    const lineIds = lineThrough(tree, current);
    const mainLine = onMainLine;
    const reviewed = recordOf(tree, lineIds);
    const total = reviewed.moves.length + 1;
    setReview({ status: "running", done: 0, total });

    // A separate engine, so stepping through the game doesn't interrupt the review.
    const reviewer = new StockfishEngine(createStockfishWorker);
    try {
      await reviewer.whenReady();
      const analyses = await analyseGame(reviewer, reviewed, {
        depth: reviewDepth,
        cache,
        signal: controller.signal,
        onProgress: (done) => setReview({ status: "running", done, total }),
      });
      if (!analyses || controller.signal.aborted) {
        setReview({ status: "idle" }); // cancelled, or a new game was loaded meanwhile
        return;
      }
      // Attach each verdict to its node in the tree, adding to earlier reviews.
      const results = reviewMoves(reviewed, analyses).map((r, i) => ({ ...r, id: lineIds[i] }));
      setVerdicts((v) => ({ ...v, ...Object.fromEntries(results.map((r) => [r.id, r])) }));
      setReview({ status: "done", lineIds, mainLine });
    } catch (e) {
      setReview({ status: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      reviewer.dispose();
    }
  }

  // Verdicts of the last reviewed line, leaving out moves that have since been deleted.
  const reviewedMoves =
    review.status === "done" ? review.lineIds.filter((id) => has(tree, id) && verdicts[id]).map((id) => verdicts[id]) : [];
  const annotations: Record<string, Classification> = {};
  for (const [id, r] of Object.entries(verdicts)) if (has(tree, id)) annotations[id] = r.classification;
  // The reviewed move that comes next on this line, from the position on screen.
  const nextId = node.children[0];
  const upcoming = nextId ? (verdicts[nextId] ?? null) : null;

  // ---- Arrows and evaluation bar ----
  const arrows: BoardArrow[] = [];
  if (upcoming && upcoming.classification !== "good") {
    const next = tree.nodes[nextId].move!;
    arrows.push({ from: next.from, to: next.to, color: PLAYED_ARROW });
  }
  if (live?.bestMove && engineOn) {
    arrows.push({ from: live.bestMove.slice(0, 2), to: live.bestMove.slice(2, 4), color: BEST_ARROW });
  }

  let barScore: Score | null = live?.score ?? null;
  if (status.kind === "checkmate") barScore = { type: "mate", winner: status.winner, moves: 0 };
  else if (gameOver) barScore = { type: "cp", cp: 0 }; // stalemate or draw

  /** Every change to the session also clears any half-finished click. */
  function act(action: SessionAction) {
    setClick(IDLE);
    if (action.type === "new" || action.type === "load") {
      // A different game: node ids start again from n1, so old verdicts no longer apply.
      reviewAbort.current?.abort();
      setVerdicts({});
      setReview({ status: "idle" });
    }
    dispatch(action);
  }

  // Left/right arrow keys step through the game; Home/End jump to start/end.
  useKeyboardNav({
    back: () => act({ type: "back" }),
    forward: () => act({ type: "forward" }),
    start: () => act({ type: "start" }),
    end: () => act({ type: "end" }),
  });

  function playMove(move?: MoveInput) {
    if (move) dispatch({ type: "play", move });
  }

  function handleSquareClick(square: string) {
    if (gameOver) return;
    const result = clickSquare(fen, click, square);
    setClick(result.state);
    playMove(result.move);
  }

  function handlePromotion(piece: PromotionPiece) {
    const result = choosePromotion(click, piece);
    setClick(result.state);
    playMove(result.move);
  }

  function loadFen() {
    const result = checkFen(importText);
    if (result.ok) {
      act({ type: "new", startFen: result.fen });
      setImportMessage({ ok: true, text: "Position loaded." });
    } else {
      setImportMessage({ ok: false, text: `Invalid FEN: ${result.error}` });
    }
  }

  function loadPgn() {
    const result = importPgn(importText);
    if (result.ok) {
      act({ type: "load", game: result.game });
      // chess.js fills missing headers with "?" (names) and "*" (result): treat those as unknown.
      const known = (v?: string) => (v && v !== "?" && v !== "*" ? v : undefined);
      const White = known(result.game.headers.White);
      const Black = known(result.game.headers.Black);
      const Result = known(result.game.headers.Result);
      const who = White && Black ? `${White} vs ${Black}` : "Game";
      setImportMessage({
        ok: true,
        text: `${who}: ${result.game.moves.length} half-moves loaded${Result ? ` (${Result})` : ""}.`,
      });
    } else {
      setImportMessage({ ok: false, text: `Could not read PGN: ${result.error}` });
    }
  }

  const squareStyles = buildSquareStyles({
    click,
    lastMove: node.move,
    checkSquare: checkedKingSquare(fen),
  });

  return (
    <main className="layout">
      <section className="board board-row">
        {engineOn && <EvalBar score={barScore} orientation={orientation} />}
        <div className="board-wrap">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            onSquareClick={handleSquareClick}
            squareStyles={squareStyles}
            arrows={arrows}
          />
          {click.kind === "choosingPromotion" && (
            <PromotionPicker color={turn(fen)} onChoose={handlePromotion} onCancel={() => setClick(IDLE)} />
          )}
        </div>
      </section>

      <aside className="panel">
        <h1>Chess Trainer</h1>

        <p className={`status ${gameOver ? "status-over" : ""}`}>{describeStatus(status)}</p>

        <div className="nav" aria-label="Move navigation">
          <button onClick={() => act({ type: "start" })} disabled={current === ROOT} title="Start (Home)">⏮</button>
          <button onClick={() => act({ type: "back" })} disabled={current === ROOT} title="Back (←)">◀</button>
          <button onClick={() => act({ type: "forward" })} disabled={!hasMovesAfter} title="Forward (→)">▶</button>
          <button onClick={() => act({ type: "end" })} disabled={!hasMovesAfter} title="End of this line (End)">⏭</button>
        </div>

        <MoveList tree={tree} current={current} onSelect={(id) => act({ type: "goTo", id })} annotations={annotations} />

        {hasMovesAfter && (
          <p className="hint">
            Viewing an earlier position. Playing a different move here starts a variation; the moves that
            followed are kept.
          </p>
        )}

        <div className="buttons">
          <button
            onClick={() => act({ type: "delete" })}
            disabled={current === ROOT}
            title="Deletes the move on screen and every move after it in this line"
          >
            Delete move
          </button>
          {!onMainLine && (
            <button onClick={() => act({ type: "promote" })} title="Makes this variation the main line">
              Make main line
            </button>
          )}
          <button onClick={() => act({ type: "new", startFen: STARTING_FEN })}>New game</button>
          <button onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}>Flip board</button>
        </div>

        <EnginePanel
          live={live}
          enabled={engineOn}
          onToggle={setEngineOn}
          engineError={engineError}
          engineLoading={!engine}
          gameOver={gameOver}
        />

        <ReviewPanel
          review={review}
          moves={reviewedMoves}
          target={onMainLine ? "main line" : "this variation"}
          canReview={lineThrough(tree, current).length > 0}
          depth={reviewDepth}
          onDepthChange={setReviewDepth}
          onStart={startReview}
          onCancel={() => reviewAbort.current?.abort()}
          onJump={(id) => act({ type: "goTo", id: tree.nodes[id].parent ?? ROOT })}
          upcoming={upcoming}
        />

        <details className="import">
          <summary>Import a game (PGN) or position (FEN)</summary>
          <textarea
            rows={6}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Paste a PGN from Chess.com or Lichess, e.g.\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#\n\nor a FEN string."}
            spellCheck={false}
          />
          <div className="buttons">
            <button onClick={loadPgn}>Load PGN</button>
            <button onClick={loadFen}>Load FEN</button>
          </div>
          {importMessage && <p className={importMessage.ok ? "muted" : "error"}>{importMessage.text}</p>}
        </details>

        <p className="muted fen">Current: {fen}</p>
        <Link href="/openings/kings-gambit">Opening lessons: King&apos;s Gambit →</Link>
        <Link href="/engine-spike">Engine spike (Milestone 2) →</Link>
      </aside>
    </main>
  );
}
