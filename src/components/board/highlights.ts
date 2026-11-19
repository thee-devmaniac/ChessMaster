import type { CSSProperties } from "react";
import type { ClickState } from "@/lib/chess/clickToMove";

/**
 * Builds the per-square styles for the board: selection, move dots, capture
 * rings, the last move and a king in check. The styles are layered in order,
 * so later ones (check) win over earlier ones (last move) on the same square.
 */

const SELECTED = "rgba(255, 213, 0, 0.55)";
const LAST_MOVE = "rgba(255, 235, 120, 0.45)";

// A small dark dot in the middle of the square: "you can move here".
const DOT = "radial-gradient(circle, rgba(0,0,0,0.25) 20%, transparent 21%)";
// A ring around the edge of the square: "you can capture here".
const RING = "radial-gradient(circle, transparent 58%, rgba(0,0,0,0.25) 59%, rgba(0,0,0,0.25) 70%, transparent 71%)";
// A red glow under a king in check.
const CHECK = "radial-gradient(circle, rgba(255,0,0,0.75) 25%, rgba(255,0,0,0) 75%)";

export interface HighlightInput {
  click: ClickState;
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
}

export function buildSquareStyles({ click, lastMove, checkSquare }: HighlightInput) {
  const styles: Record<string, CSSProperties> = {};
  const add = (square: string, style: CSSProperties) => {
    styles[square] = { ...styles[square], ...style };
  };

  if (lastMove) {
    add(lastMove.from, { backgroundColor: LAST_MOVE });
    add(lastMove.to, { backgroundColor: LAST_MOVE });
  }
  // Only longhand properties (backgroundColor / backgroundImage), never the
  // "background" shorthand: mixing the two on one square makes React warn and
  // can leave stale colours behind when a highlight is removed.
  if (checkSquare) add(checkSquare, { backgroundImage: CHECK });

  if (click.kind === "selected") {
    add(click.from, { backgroundColor: SELECTED });
    for (const t of click.targets) {
      add(t.to, { backgroundImage: t.isCapture ? RING : DOT });
    }
  }
  if (click.kind === "choosingPromotion") {
    add(click.from, { backgroundColor: SELECTED });
    add(click.to, { backgroundColor: SELECTED });
  }
  return styles;
}
