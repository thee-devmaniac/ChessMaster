"use client";

import type { Score } from "@/lib/engine/types";
import { formatScore } from "@/lib/engine/score";

/** Short label for the narrow bar: "0.3", "2.5", "M3", "1-0". Its position shows who is better. */
function barLabel(score: Score): string {
  if (score.type === "mate") return score.moves === 0 ? formatScore(score) : `M${score.moves}`;
  return Math.abs(score.cp / 100).toFixed(1);
}
import type { Orientation } from "@/components/board/ChessBoard";

/**
 * How much of the bar is white, from 0 to 100.
 * An S-shaped curve: small advantages move the bar a lot, and big ones level
 * off, the way a 2-pawn lead already means "probably winning".
 */
export function whiteShare(score: Score): number {
  if (score.type === "mate") return score.winner === "w" ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.004 * score.cp)) - 1);
}

interface Props {
  score: Score | null;
  orientation: Orientation;
}

/** The vertical bar beside the board. White's part grows from White's side. */
export function EvalBar({ score, orientation }: Props) {
  const white = score ? whiteShare(score) : 50;
  const label = score ? formatScore(score) : "";
  const short = score ? barLabel(score) : "";
  const whiteAtBottom = orientation === "white";
  const whiteLeads = white >= 50;
  return (
    <div
      className="eval-bar"
      style={{ flexDirection: whiteAtBottom ? "column" : "column-reverse" }}
      title={label ? `Evaluation: ${label} (White's point of view)` : "No evaluation yet"}
      aria-label={label ? `Evaluation ${label}` : "No evaluation"}
    >
      <div className="eval-black" style={{ flexBasis: `${100 - white}%` }} />
      <div className="eval-white" style={{ flexBasis: `${white}%` }} />
      <span
        className={[
          "eval-label",
          // The label sits at the leading side's end of the bar, in a colour readable on that side.
          whiteLeads === whiteAtBottom ? "eval-label-bottom" : "eval-label-top",
          whiteLeads ? "eval-label-dark" : "eval-label-light",
        ].join(" ")}
      >
        {short}
      </span>
    </div>
  );
}
