"use client";

import { useEffect, useMemo, useState } from "react";
import { ChessBoard, type BoardArrow, type Orientation } from "@/components/board/ChessBoard";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { ARROW } from "@/components/board/theme";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { checkedKingSquare, lineToSan, makeMove, turn, type MoveInput, type PlayedMove, type PromotionPiece } from "@/lib/chess/rules";
import { AnalysisCancelledError } from "@/lib/engine/StockfishEngine";
import { formatScore } from "@/lib/engine/score";
import type { Score } from "@/lib/engine/types";
import { allLines, moveLabel } from "@/lib/openings/navigate";
import { checkGuess, hintsFor, isQuizMove, type GuessResult, type QuizSide } from "@/lib/openings/predict";
import { OPENING_ROOT, type Opening } from "@/lib/openings/types";
import { useStockfish } from "@/hooks/useStockfish";
import { OpeningNote } from "./OpeningNote";
import { LineList } from "./LineList";

const NEXT_ARROW = ARROW.next; // blue: the move that comes next
const REPLY_ARROW = ARROW.played; // crimson: how the opponent punishes a wrong guess
const NAME = { w: "White", b: "Black" } as const;

type Outcome = "first try" | "with help" | "shown";

type Phase =
  /** Waiting for a guess. `hints` = how many hints are showing; `missed` = a wrong guess was made. */
  | { kind: "quiz"; hints: number; missed: boolean }
  /** A wrong guess is on the board, with its consequence. */
  | { kind: "wrong"; hints: number; played: PlayedMove; result: GuessResult };

const FRESH: Phase = { kind: "quiz", hints: 0, missed: false };

/**
 * Predict: the app pauses before each of your moves and asks what you would
 * play. Hints come in steps. A wrong guess is shown on the board together
 * with the opponent's best answer, so you see WHY it's wrong.
 */
export function PredictMode({ opening }: { opening: Opening }) {
  const lines = useMemo(() => allLines(opening), [opening]);
  const [lineIndex, setLineIndex] = useState(0);
  const [side, setSide] = useState<QuizSide>(opening.playAs);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>(FRESH);
  const [results, setResults] = useState<Record<string, Outcome>>({});
  const [click, setClick] = useState<ClickState>(IDLE);
  const [orientation, setOrientation] = useState<Orientation>(opening.playAs === "w" ? "white" : "black");
  // The square to flash gold after a correct guess (cleared after the animation).
  const [flash, setFlash] = useState<string | null>(null);
  // Shown after an "also good" guess: the move was right, but the lesson carries on with its own move.
  // `atStep` keeps it on screen only while the board still shows the lesson's move.
  const [alsoGood, setAlsoGood] = useState<{ san: string; note: string; lessonMove: string; atStep: number } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(timer);
  }, [flash]);

  const line = lines[lineIndex];
  const node = opening.nodes[step === 0 ? OPENING_ROOT : line.ids[step - 1]];
  const next = step < line.ids.length ? opening.nodes[line.ids[step]] : null;
  const quiz = next !== null && isQuizMove(opening, next, side);
  const hints = next && quiz ? hintsFor(opening, next) : [];

  // ---- The engine shows how a wrong guess gets punished ----
  const { engine } = useStockfish();
  const [punish, setPunish] = useState<{ fen: string; bestMove: string | null; score: Score } | null>(null);
  const wrongFen = phase.kind === "wrong" ? phase.played.fenAfter : null;
  useEffect(() => {
    if (!engine || !wrongFen) return;
    let active = true;
    engine
      .analyse(wrongFen, { movetimeMs: 1000 })
      .then((a) => active && setPunish({ fen: wrongFen, bestMove: a.bestMove, score: a.score }))
      .catch((e) => {
        if (!(e instanceof AnalysisCancelledError)) console.error(e);
      });
    return () => {
      active = false;
      engine.cancel();
    };
  }, [engine, wrongFen]);
  const reply = punish && punish.fen === wrongFen ? punish : null;

  function restart(newLine = lineIndex, newSide = side) {
    setLineIndex(newLine);
    setSide(newSide);
    setStep(0);
    setPhase(FRESH);
    setResults({});
    setClick(IDLE);
    setAlsoGood(null);
  }

  /** Moves on past the quiz move, recording how it went. */
  function advance(outcome: Outcome) {
    setResults((r) => ({ ...r, [next!.id]: outcome }));
    setStep((s) => s + 1);
    setPhase(FRESH);
  }

  function guess(move: MoveInput) {
    if (!next || phase.kind !== "quiz") return;
    const played = makeMove(node.fen, move);
    if (!played) return;
    const result = checkGuess(opening, next, played.san);
    setAlsoGood(null);
    if (result.kind === "correct" || result.kind === "also-good") {
      setFlash(played.to);
      if (result.kind === "also-good") setAlsoGood({ san: played.san, note: result.note, lessonMove: moveLabel(next), atStep: step + 1 });
      advance(phase.hints > 0 || phase.missed ? "with help" : "first try");
    }
    else setPhase({ kind: "wrong", hints: phase.hints, played, result });
  }

  function handleSquareClick(square: string) {
    if (!quiz || phase.kind !== "quiz") return;
    const r = clickSquare(node.fen, click, square);
    setClick(r.state);
    if (r.move) guess(r.move);
  }

  function handlePromotion(piece: PromotionPiece) {
    const r = choosePromotion(click, piece);
    setClick(r.state);
    if (r.move) guess(r.move);
  }

  // ---- Board ----
  const boardFen = phase.kind === "wrong" ? phase.played.fenAfter : node.fen;
  const shownMove = phase.kind === "wrong" ? phase.played : node.uci ? { from: node.uci.slice(0, 2), to: node.uci.slice(2, 4) } : null;
  const arrows: BoardArrow[] = [];
  if (phase.kind === "wrong" && reply?.bestMove) {
    arrows.push({ from: reply.bestMove.slice(0, 2), to: reply.bestMove.slice(2, 4), color: REPLY_ARROW });
  } else if (next && (!quiz || phase.hints >= hints.length)) {
    arrows.push({ from: next.uci!.slice(0, 2), to: next.uci!.slice(2, 4), color: NEXT_ARROW });
  }
  const squareStyles = buildSquareStyles({ click, lastMove: shownMove, checkSquare: checkedKingSquare(boardFen) });
  if (flash) squareStyles[flash] = { ...squareStyles[flash], animation: "goldPulse 0.7s ease-out" };

  // ---- Score ----
  const quizIds = line.ids.filter((id) => isQuizMove(opening, opening.nodes[id], side));
  const count = (o: Outcome) => Object.values(results).filter((r) => r === o).length;

  return (
    <div className="layout">
      {/* A wrong guess shakes the board once (the class is only present while the guess is shown). */}
      <section className={`board board-wrap ${phase.kind === "wrong" ? "shake" : ""}`}>
        <ChessBoard fen={boardFen} orientation={orientation} onSquareClick={handleSquareClick} squareStyles={squareStyles} arrows={arrows} />
        {click.kind === "choosingPromotion" && (
          <PromotionPicker color={turn(node.fen)} onChoose={handlePromotion} onCancel={() => setClick(IDLE)} />
        )}
      </section>

      <aside className="panel">
        <div className="card">
          <h2>{line.name}</h2>
          <div className="buttons">
            <label className="muted">
              Guess the moves of{" "}
              <select value={side} onChange={(e) => restart(lineIndex, e.target.value as QuizSide)}>
                <option value="both">both sides</option>
                <option value="w">White</option>
                <option value="b">Black</option>
              </select>
            </label>
            <button onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}>Flip board</button>
          </div>
          <progress value={step} max={line.ids.length} />
          <p className="muted">
            Score: {count("first try")} first try · {count("with help")} with help · {count("shown")} shown · of{" "}
            {quizIds.length}
          </p>
        </div>

        {/* What just happened: the explanation of the last move played. */}
        {alsoGood?.atStep === step && phase.kind !== "wrong" && (
          <section className="card verdict-good" role="status">
            <h2>{alsoGood.san} works too!</h2>
            <p>
              {alsoGood.note} This lesson continues with <strong>{alsoGood.lessonMove}</strong>, shown on the board.
            </p>
          </section>
        )}
        {phase.kind !== "wrong" && <OpeningNote node={node} intro={opening.intro} />}

        {next === null ? (
          <section className="card verdict-good">
            <h2>Line complete</h2>
            <p>
              {count("first try")} of {quizIds.length} found on the first try.
              {count("shown") > 0 && " Try the line again to find the moves you were shown."}
            </p>
            <div className="buttons">
              <button onClick={() => restart()}>Try this line again</button>
            </div>
          </section>
        ) : !quiz ? (
          <section className="card">
            <p>
              {NAME[turn(node.fen)]} plays <strong>{moveLabel(next)}</strong>
              {next.tags.includes("mistake") ? ", falling into the trap" : ""} (blue arrow).
            </p>
            <div className="buttons">
              <button onClick={() => setStep((s) => s + 1)}>Continue ▶</button>
            </div>
          </section>
        ) : phase.kind === "quiz" ? (
          <section className="card quiz">
            <h2>What would {NAME[turn(node.fen)]} play here?</h2>
            <p className="muted">Play your move on the board.</p>
            {hints.slice(0, phase.hints).map((h, i) => (
              <p key={i} className="hint-line">
                Hint {i + 1}: {h}
              </p>
            ))}
            <div className="buttons">
              {phase.hints < hints.length ? (
                <button onClick={() => setPhase({ ...phase, hints: phase.hints + 1 })}>
                  {phase.hints === hints.length - 1 ? "Show the answer" : `Hint (${phase.hints + 1} of ${hints.length - 1})`}
                </button>
              ) : (
                <button onClick={() => advance("shown")}>Play {next.san} and continue ▶</button>
              )}
            </div>
          </section>
        ) : (
          <section className="card off-book">
            <h2>
              {phase.result.kind === "other-book"
                ? "Good move, different line"
                : phase.result.kind === "book-mistake"
                  ? "A known mistake"
                  : "Not this lesson's move"}
              : {phase.played.san}
            </h2>
            {phase.result.kind === "wrong" && (
              <p className="muted">
                It may still be a reasonable move: the lesson just doesn&apos;t cover it. The engine&apos;s view is below.
              </p>
            )}
            {phase.result.kind === "book-mistake" && (
              <p>
                <strong>{phase.played.san}</strong> is a known mistake. {phase.result.node.explanation}
              </p>
            )}
            {phase.result.kind === "other-book" && (
              <p>
                <strong>{phase.played.san}</strong> is also a book move
                {phase.result.node.name ? ` (${phase.result.node.name})` : ""}, but this line continues differently. Can you
                find the move this line plays?
              </p>
            )}
            {phase.result.kind !== "other-book" &&
              (reply ? (
                reply.bestMove ? (
                  <p>
                    After {phase.played.san}, the best answer is{" "}
                    <strong>{lineToSan(phase.played.fenAfter, [reply.bestMove], 1)[0]}</strong> (crimson arrow). With best play, the
                    engine rates the position <strong>{formatScore(reply.score)}</strong> (from White&apos;s point of view).
                  </p>
                ) : (
                  <p>That move ends the game.</p>
                )
              ) : (
                <p className="muted">Asking the engine how the opponent would answer…</p>
              ))}
            <div className="buttons">
              <button onClick={() => setPhase({ kind: "quiz", hints: phase.hints, missed: true })}>Try again</button>
            </div>
          </section>
        )}

        <LineList lines={lines} selected={lineIndex} onSelect={(i) => restart(i)} title="Choose a line" />
      </aside>
    </div>
  );
}
