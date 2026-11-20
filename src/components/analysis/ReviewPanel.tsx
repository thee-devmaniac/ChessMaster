"use client";

import { useState, type CSSProperties } from "react";
import type { Color } from "@/lib/engine/types";
import { formatScore } from "@/lib/engine/score";
import { SYMBOL, summarise, worstMoves, type Classification, type ReviewedMove } from "@/lib/review/classify";
import type { MoveTiming } from "@/lib/review/time";
import { formatClock, formatDuration } from "@/lib/chess/clock";

/** "took 1.0s · 0:26 left", plus a flag for time trouble or rushing. */
function timeNote(t?: MoveTiming): string {
  if (!t || t.clockMs === undefined) return "";
  const took = t.spentMs !== undefined ? `took ${formatDuration(t.spentMs)} · ` : "";
  const flag = t.lowTime ? " · time trouble" : t.rushed ? " · rushed" : "";
  return ` · ${took}${formatClock(t.clockMs)} left${flag}`;
}

export type ReviewState =
  | { status: "idle" }
  | { status: "running"; done: number; total: number }
  | { status: "done"; lineIds: string[]; mainLine: boolean }
  | { status: "error"; message: string };

const LABEL: Record<Classification, string> = {
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

interface Props {
  review: ReviewState;
  /** Verdicts for the last reviewed line (moves deleted since are left out). */
  moves: ReviewedMove[];
  /** What the button will review: the main line, or the variation on screen. */
  target: "main line" | "this variation";
  canReview: boolean;
  depth: number;
  onDepthChange: (d: number) => void;
  onStart: () => void;
  onCancel: () => void;
  /** Called with a reviewed move's node id; the page shows the position just before it. */
  onJump: (id: string) => void;
  /** The reviewed move that is about to be played from the position on screen. */
  upcoming: ReviewedMove | null;
  /** Clock data by node id, for games imported with clock times. */
  timing?: Record<string, MoveTiming>;
}

const fullMove = (r: ReviewedMove) => `${r.moveNumber}${r.mover === "w" ? "." : "..."} ${r.san}`;

export function ReviewPanel(props: Props) {
  const { review, moves, target, canReview, depth, onDepthChange, onStart, onCancel, onJump, upcoming, timing } = props;
  const [side, setSide] = useState<Color | "both">("both");

  const controls = (
    <div className="buttons">
      <button onClick={onStart} disabled={!canReview || review.status === "running"}>
        {target === "main line" ? "Review game" : "Review this variation"}
      </button>
      <label className="muted">
        Depth{" "}
        <select value={depth} onChange={(e) => onDepthChange(Number(e.target.value))} disabled={review.status === "running"}>
          {[10, 12, 14, 16, 18].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  let body: React.ReactNode = null;
  if (review.status === "idle") {
    body = (
      <p className="muted">
        Analyses every position, then marks each move as good, inaccuracy (?!), mistake (?) or blunder (??).
      </p>
    );
  } else if (review.status === "running") {
    body = (
      <>
        <progress value={review.done} max={review.total} />
        <p className="muted">
          Analysing position {review.done} of {review.total}…{" "}
          <button className="link-button" onClick={onCancel}>
            Cancel
          </button>
        </p>
      </>
    );
  } else if (review.status === "error") {
    body = <p className="error">Review failed: {review.message}</p>;
  } else {
    const list = worstMoves(moves, side === "both" ? undefined : side);
    body = (
      <>
        <p className="muted">
          Reviewed {review.mainLine ? "the main line" : "a variation"} ({review.lineIds.length} half-moves).
        </p>

        <table className="summary">
          <thead>
            <tr>
              <th></th>
              <th>?!</th>
              <th>?</th>
              <th>??</th>
              <th title="Average centipawn loss per move: lower is better">Avg loss</th>
            </tr>
          </thead>
          <tbody>
            {(["w", "b"] as const).map((c) => {
              const s = summarise(moves, c);
              return (
                <tr key={c}>
                  <td>{c === "w" ? "White" : "Black"}</td>
                  <td>{s.inaccuracies}</td>
                  <td>{s.mistakes}</td>
                  <td>{s.blunders}</td>
                  <td>{s.averageLoss}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="worst-header">
          <h3>Worst moves</h3>
          <select value={side} onChange={(e) => setSide(e.target.value as Color | "both")}>
            <option value="both">Both sides</option>
            <option value="w">White only</option>
            <option value="b">Black only</option>
          </select>
        </div>
        {list.length === 0 ? (
          <p className="muted">No inaccuracies, mistakes or blunders. Well played!</p>
        ) : (
          <ul className="worst-list">
            {list.map((r, i) => (
              // --i lets the CSS stagger the rows (see .worst-list li in globals.css).
              <li key={r.id} style={{ "--i": i } as CSSProperties}>
                <button onClick={() => r.id && onJump(r.id)}>
                  <span className={`badge badge-${r.classification}`}>{LABEL[r.classification]}</span>
                  <span className="worst-move">
                    {fullMove(r)}
                    {SYMBOL[r.classification]}
                  </span>
                  <span className="muted">
                    {formatScore(r.evalBefore)} → {formatScore(r.evalAfter)}
                    {r.bestMoveSan ? ` · better: ${r.bestMoveSan}` : ""}
                    {r.id ? timeNote(timing?.[r.id]) : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Game review</h2>
      </div>
      {controls}
      {body}
      {upcoming && upcoming.classification !== "good" && (
        <p className={`verdict verdict-${upcoming.classification}`}>
          Next move in the game: <strong>{fullMove(upcoming)}{SYMBOL[upcoming.classification]}</strong>,{" "}
          {upcoming.classification === "inaccuracy" ? "an" : "a"}{" "}
          {LABEL[upcoming.classification].toLowerCase()} ({formatScore(upcoming.evalBefore)} →{" "}
          {formatScore(upcoming.evalAfter)}). The crimson arrow shows it; the gold arrow shows the engine&apos;s
          choice{upcoming.bestMoveSan ? `, ${upcoming.bestMoveSan}` : ""}.
        </p>
      )}
    </section>
  );
}
