"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { checkedKingSquare, legalTargets, makeMove, sanToMove, turn, type MoveInput, type PlayedMove, type PromotionPiece } from "@/lib/chess/rules";
import { FIRST_STEPS, moveMeetsGoal, type LessonStep } from "@/lib/learn/firstSteps";

/** The step the learner reached, remembered in this browser (if storage is available). */
const STORAGE_KEY = "chess-trainer:first-steps";

function loadSavedStep(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(n) && n >= 0 && n < FIRST_STEPS.length ? n : 0;
  } catch {
    return 0;
  }
}

function saveStep(n: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // Storage unavailable (e.g. some private modes): the lesson still works, it just won't remember.
  }
}

/** The selected-piece state that shows a piece's moves as dots. */
function selectionFor(step: LessonStep): ClickState {
  if (!step.showMovesFrom) return IDLE;
  return { kind: "selected", from: step.showMovesFrom, targets: legalTargets(step.fen, step.showMovesFrom) };
}

type Feedback = { ok: boolean; text: string } | null;

/**
 * The rules of chess, one small task at a time. Wrong tries get a hint and
 * the position resets; "Show me" plays the answer. The step you reached is
 * remembered in this browser.
 */
export function FirstSteps() {
  const [index, setIndex] = useState(0);
  const step = FIRST_STEPS[index];
  const [fen, setFen] = useState(step.fen);
  const [lastMove, setLastMove] = useState<PlayedMove | undefined>(undefined);
  const [click, setClick] = useState<ClickState>(() => selectionFor(step));
  const [done, setDone] = useState(step.goal.kind === "read");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [clickedSquare, setClickedSquare] = useState<string | null>(null);

  // Resume where the learner left off (read after the first render: storage only exists in the browser).
  useEffect(() => {
    const saved = loadSavedStep();
    if (saved !== 0) goTo(saved);
  }, []);

  function goTo(n: number) {
    const s = FIRST_STEPS[n];
    setIndex(n);
    setFen(s.fen);
    setLastMove(undefined);
    setClick(selectionFor(s));
    setDone(s.goal.kind === "read");
    setFeedback(null);
    setClickedSquare(null);
    saveStep(n);
  }

  function tryMove(input?: MoveInput) {
    if (!input || done) return;
    const move = makeMove(fen, input);
    if (!move) return;
    if (moveMeetsGoal(step.goal, move)) {
      setFen(move.fenAfter);
      setLastMove(move);
      setDone(true);
      setFeedback({ ok: true, text: step.success });
    } else {
      // Not the task: put the position back and give the hint.
      setFen(step.fen);
      setLastMove(undefined);
      setClick(selectionFor(step));
      setFeedback({ ok: false, text: `Not quite. ${step.hint}` });
    }
  }

  function handleSquareClick(square: string) {
    if (done) return;
    if (step.goal.kind === "square") {
      setClickedSquare(square);
      if (square === step.goal.square) {
        setDone(true);
        setFeedback({ ok: true, text: step.success });
      } else {
        setFeedback({ ok: false, text: `That's ${square}. ${step.hint}` });
      }
      return;
    }
    const r = clickSquare(fen, click, square);
    setClick(r.state);
    tryMove(r.move);
  }

  function handlePromotion(piece: PromotionPiece) {
    const r = choosePromotion(click, piece);
    setClick(r.state);
    tryMove(r.move);
  }

  /** Plays the step's solution, exactly as if the learner had clicked it. */
  function showMe() {
    if (!step.solution) return;
    if (step.goal.kind === "square") return handleSquareClick(step.solution);
    tryMove(sanToMove(fen, step.solution) ?? undefined); // the tests check every solution is legal
  }

  const tint = "linear-gradient(rgba(212, 175, 55, 0.55), rgba(212, 175, 55, 0.55))";
  const squareStyles: Record<string, CSSProperties> = buildSquareStyles({ click, lastMove, checkSquare: checkedKingSquare(fen) });
  if (clickedSquare) {
    const existing = squareStyles[clickedSquare]?.backgroundImage;
    squareStyles[clickedSquare] = { backgroundImage: existing ? `${tint}, ${existing}` : tint };
  }
  const last = index === FIRST_STEPS.length - 1;
  const orientation = step.fen.split(" ")[1] === "b" && step.goal.kind !== "read" ? "black" : "white";

  return (
    <main className="layout">
      <section className="board board-wrap">
        <ChessBoard fen={fen} orientation={orientation} onSquareClick={handleSquareClick} squareStyles={squareStyles} />
        {click.kind === "choosingPromotion" && (
          <PromotionPicker color={turn(fen)} onChoose={handlePromotion} onCancel={() => setClick(IDLE)} />
        )}
      </section>

      <aside className="panel">
        <div>
          <p className="section-tag">
            First steps · {index + 1} of {FIRST_STEPS.length}
          </p>
          <h1 className="page-title">
            <span className="title-solid">{step.title}</span>
          </h1>
        </div>
        <progress value={index + (done ? 1 : 0)} max={FIRST_STEPS.length} aria-label="Lesson progress" />

        <section className="card">
          {step.text.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </section>

        <section className={`card ${done && step.goal.kind !== "read" ? "verdict-good" : "quiz"}`} aria-live="polite">
          <h2>{done && step.goal.kind !== "read" ? "Done!" : "Your task"}</h2>
          <p>{done && feedback?.ok ? feedback.text : step.task}</p>
          {!done && feedback && !feedback.ok && <p className="hint-line">{feedback.text}</p>}
          {!done && step.solution && (
            <div className="buttons">
              <button onClick={showMe}>Show me</button>
            </div>
          )}
        </section>

        <div className="buttons">
          <button onClick={() => goTo(index - 1)} disabled={index === 0}>
            ◀ Back
          </button>
          {!last ? (
            <button className={done ? "btn-start" : undefined} onClick={() => goTo(index + 1)} disabled={!done}>
              Next ▶
            </button>
          ) : (
            <Link href="/play" className="btn-gold">
              Play your first game
            </Link>
          )}
          {index > 0 && (
            <button onClick={() => goTo(0)} className="muted">
              Start over
            </button>
          )}
        </div>
        {last && (
          <p className="muted">
            Tip: start with the Pawn bot and coach mode on. The coach explains every move the bot makes.
          </p>
        )}
      </aside>
    </main>
  );
}
