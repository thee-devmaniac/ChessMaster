"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { ChessBoard, type Orientation } from "@/components/board/ChessBoard";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { STARTING_FEN } from "@/lib/chess/fen";
import { checkedKingSquare, importPgn, turn, type MoveInput, type PromotionPiece } from "@/lib/chess/rules";
import { describeStatus } from "@/lib/chess/describe";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { currentFen, currentStatus, newSession, recordOf, sessionReducer, type SessionAction } from "@/lib/chess/game";
import { ROOT, continuation, has, isMainLine, lineThrough, moveNumberOf } from "@/lib/chess/tree";
import { TimePanel } from "@/components/analysis/TimePanel";
import { ImportPanel } from "@/components/analysis/ImportPanel";
import { takeQueuedGame } from "@/lib/chess/handoff";
import { hasClockData, moveTimings, type MoveTiming } from "@/lib/review/time";
import { EvalBar } from "@/components/analysis/EvalBar";
import { EnginePanel } from "@/components/analysis/EnginePanel";
import { ReviewPanel, type ReviewState } from "@/components/analysis/ReviewPanel";
import type { BoardArrow } from "@/components/board/ChessBoard";
import { ARROW } from "@/components/board/theme";
import { useStockfish } from "@/hooks/useStockfish";
import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import { AnalysisCache } from "@/lib/engine/cache";
import { StockfishEngine } from "@/lib/engine/StockfishEngine";
import { createStockfishWorker } from "@/lib/engine/createStockfishWorker";
import type { Score } from "@/lib/engine/types";
import { analyseGame, DEFAULT_REVIEW_DEPTH } from "@/lib/review/analyseGame";
import { reviewMoves, type Classification, type ReviewedMove } from "@/lib/review/classify";

const BEST_ARROW = ARROW.best; // gold: the engine's move
const PLAYED_ARROW = ARROW.played; // crimson: the move played in the game

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

  // A game sent from the Play page ("Review this game"): load it once, then review it.
  // The ref holds how many moves the game has, so the review starts only once
  // the tree really contains them (both effects first run in the same instant,
  // before the loaded game has reached the tree).
  const reviewWhenLoaded = useRef<number | null>(null);
  useEffect(() => {
    const pgn = takeQueuedGame();
    if (!pgn) return;
    const result = importPgn(pgn);
    if (!result.ok || result.game.moves.length === 0) return;
    reviewWhenLoaded.current = result.game.moves.length;
    dispatch({ type: "load", game: result.game });
  }, []);
  useEffect(() => {
    if (reviewWhenLoaded.current === null || continuation(tree, ROOT).length !== reviewWhenLoaded.current) return;
    reviewWhenLoaded.current = null;
    startReview();
    // startReview reads the tree of this render, which now holds the handed-over game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

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

  // ---- Clock: time analysis of the main line (only imported moves carry clock times) ----
  const mainIds = continuation(tree, ROOT);
  const mainLine = recordOf(tree, mainIds);
  const showClock = hasClockData(mainLine);
  const timings = showClock ? moveTimings(mainLine) : [];
  const timingById: Record<string, MoveTiming> = {};
  timings.forEach((t, i) => (timingById[mainIds[i]] = t));
  const verdictsByPly = new Map<number, ReviewedMove>();
  mainIds.forEach((id, i) => verdicts[id] && verdictsByPly.set(i + 1, verdicts[id]));
  const moveName = (ply: number) => {
    const id = mainIds[ply - 1];
    const { number, color } = moveNumberOf(tree, id);
    return `${number}${color === "w" ? "." : "..."} ${tree.nodes[id].move!.san}`;
  };
  // Where the board is along the main line (null when in a variation).
  const currentPly = current === ROOT ? 0 : mainIds.includes(current) ? mainIds.indexOf(current) + 1 : null;

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
        <div>
          <p className="section-tag">Analysis board</p>
          <h1 className="page-title">
            <span className="title-outline">Review</span> <span className="title-solid">your game</span>
          </h1>
        </div>

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
          timing={timingById}
        />

        {showClock && (
          <TimePanel
            timings={timings}
            timeControl={mainLine.timeControl}
            verdicts={verdictsByPly}
            moveName={moveName}
            currentPly={currentPly}
            onSelect={(ply) => act({ type: "goTo", id: mainIds[ply - 1] })}
          />
        )}

        <ImportPanel
          onLoadGame={(game) => act({ type: "load", game })}
          onLoadFen={(startFen) => act({ type: "new", startFen })}
        />

        <p className="muted fen">Current: {fen}</p>
      </aside>
    </main>
  );
}
