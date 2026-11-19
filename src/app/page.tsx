"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ChessBoard, type Orientation } from "@/components/board/ChessBoard";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { STARTING_FEN, checkFen } from "@/lib/chess/fen";
import { checkedKingSquare, importPgn, turn, type GameStatus, type MoveInput, type PromotionPiece } from "@/lib/chess/rules";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { currentFen, isAtEnd, newSession, sessionReducer, statusAt, type SessionAction } from "@/lib/chess/game";
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
import { reviewMoves, type Classification } from "@/lib/review/classify";

const BEST_ARROW = "rgba(21, 128, 61, 0.8)"; // green: the engine's move
const PLAYED_ARROW = "rgba(200, 30, 30, 0.75)"; // red: the move played in the game

const NAME = { w: "White", b: "Black" } as const;

function describeStatus(s: GameStatus): string {
  switch (s.kind) {
    case "playing":
      return `${NAME[s.turn]} to move${s.inCheck ? " (in check!)" : ""}`;
    case "checkmate":
      return `Checkmate: ${NAME[s.winner]} wins`;
    case "stalemate":
      return "Stalemate: draw (the side to move has no legal move but is not in check)";
    case "draw":
      return `Draw by ${s.reason}`;
  }
}

/**
 * Version 1: recreate a game, step through it, see the engine's view of every
 * position, and review the whole game for mistakes.
 *
 * State:
 *  - `session` (game record + view index), changed only through sessionReducer
 *  - `click`, the UI-only click-to-move state
 *  - `review`, the result of the last full-game review
 * Engine results live in `cache`, shared by live analysis and the review.
 */
export default function Home() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => newSession());
  const [click, setClick] = useState<ClickState>(IDLE);
  const [orientation, setOrientation] = useState<Orientation>("white");
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { game, view } = session;
  const fen = currentFen(session);
  const status = statusAt(game, view);
  const gameOver = status.kind !== "playing";
  const laterMoves = game.moves.length - view;

  // ---- Engine: one for the position on screen, one per review ----
  const [cache] = useState(() => new AnalysisCache());
  const { engine, error: engineError } = useStockfish();
  const [engineOn, setEngineOn] = useState(true);
  const live = useLiveAnalysis(engine, cache, fen, engineOn && !gameOver);

  const [review, setReview] = useState<ReviewState>({ status: "idle" });
  const [reviewDepth, setReviewDepth] = useState(DEFAULT_REVIEW_DEPTH);
  const reviewAbort = useRef<AbortController | null>(null);
  // Stop a running review if the page closes.
  useEffect(() => () => reviewAbort.current?.abort(), []);

  async function startReview() {
    reviewAbort.current?.abort();
    const controller = new AbortController();
    reviewAbort.current = controller;
    const reviewed = game; // the game as it is now; later edits make the review "stale"
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
      if (analyses) setReview({ status: "done", moves: reviewMoves(reviewed, analyses), game: reviewed });
      else setReview({ status: "idle" }); // cancelled
    } catch (e) {
      setReview({ status: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      reviewer.dispose();
    }
  }

  const reviewDone = review.status === "done" ? review : null;
  const reviewCurrent = reviewDone !== null && reviewDone.game === game;
  const annotations: Record<number, Classification> = {};
  if (reviewCurrent) for (const r of reviewDone.moves) annotations[r.ply] = r.classification;
  // The reviewed move that will be played next from the position on screen.
  const upcoming = reviewCurrent && view < game.moves.length ? reviewDone.moves[view] : null;

  // ---- Arrows and evaluation bar ----
  const arrows: BoardArrow[] = [];
  if (upcoming && upcoming.classification !== "good") {
    const next = game.moves[view];
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
    dispatch(action);
  }

  // Left/right arrow keys step through the game; Home/End jump to start/end.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return; // typing, not navigating
      const map: Record<string, SessionAction> = {
        ArrowLeft: { type: "back" },
        ArrowRight: { type: "forward" },
        Home: { type: "goTo", ply: 0 },
        End: { type: "goTo", ply: Number.MAX_SAFE_INTEGER },
      };
      const action = map[e.key];
      if (action) {
        e.preventDefault();
        setClick(IDLE);
        dispatch(action);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      act({ type: "start", startFen: result.fen });
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
    lastMove: view > 0 ? game.moves[view - 1] : null,
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
          <button onClick={() => act({ type: "goTo", ply: 0 })} disabled={view === 0} title="Start (Home)">⏮</button>
          <button onClick={() => act({ type: "back" })} disabled={view === 0} title="Back (←)">◀</button>
          <button onClick={() => act({ type: "forward" })} disabled={isAtEnd(session)} title="Forward (→)">▶</button>
          <button onClick={() => act({ type: "goTo", ply: game.moves.length })} disabled={isAtEnd(session)} title="End (End)">⏭</button>
        </div>

        <MoveList
          game={game}
          view={view}
          onSelect={(ply) => act({ type: "goTo", ply })}
          annotations={reviewCurrent ? annotations : undefined}
        />

        {laterMoves > 0 && (
          <p className="hint">
            Viewing an earlier position. Playing a different move here replaces the {laterMoves} later
            half-move{laterMoves === 1 ? "" : "s"}.
          </p>
        )}

        <div className="buttons">
          <button onClick={() => act({ type: "undo" })} disabled={game.moves.length === 0}>
            Undo last move
          </button>
          <button onClick={() => act({ type: "start", startFen: STARTING_FEN })}>New game</button>
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
          stale={reviewDone !== null && !reviewCurrent}
          canReview={game.moves.length > 0}
          depth={reviewDepth}
          onDepthChange={setReviewDepth}
          onStart={startReview}
          onCancel={() => reviewAbort.current?.abort()}
          onJump={(ply) => act({ type: "goTo", ply: ply - 1 })}
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

        <p className="muted">Current: {fen}</p>
        <Link href="/engine-spike">Engine spike (Milestone 2) →</Link>
      </aside>
    </main>
  );
}
