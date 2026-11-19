import type { CSSProperties } from "react";
import type { ClickState } from "@/lib/chess/clickToMove";
import { HIGHLIGHT } from "./theme";

/**
 * Builds the per-square styles for the board: selection, move dots, capture
 * rings, the last move and a king in check.
 *
 * Every highlight is a transparent LAYER drawn on top of the square's own
 * colour (CSS allows several background images, separated by commas). Setting
 * a semi-transparent backgroundColor instead would REPLACE the square colour
 * and let the dark page show through, which looks muddy on dark squares.
 *
 * Only backgroundImage is ever set, never "background" or backgroundColor, so
 * React never sees conflicting style properties (the warning fixed in M4).
 */

const tint = (color: string) => `linear-gradient(${color}, ${color})`;

// A small dark dot in the middle of the square: "you can move here".
const DOT = `radial-gradient(circle, ${HIGHLIGHT.dot} 20%, transparent 21%)`;
// A ring around the edge of the square: "you can capture here".
const RING = `radial-gradient(circle, transparent 58%, ${HIGHLIGHT.dot} 59%, ${HIGHLIGHT.dot} 70%, transparent 71%)`;
// A red glow under a king in check.
const CHECK = `radial-gradient(circle, ${HIGHLIGHT.check} 25%, transparent 75%)`;

export interface HighlightInput {
  click: ClickState;
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
}

export function buildSquareStyles({ click, lastMove, checkSquare }: HighlightInput) {
  // Layers per square, top layer first (the order CSS draws multiple backgrounds in).
  const layers: Record<string, string[]> = {};
  const add = (square: string, layer: string) => {
    (layers[square] ??= []).push(layer);
  };

  if (click.kind === "selected") {
    for (const t of click.targets) add(t.to, t.isCapture ? RING : DOT);
  }
  if (checkSquare) add(checkSquare, CHECK);
  if (click.kind === "selected") add(click.from, tint(HIGHLIGHT.selected));
  if (click.kind === "choosingPromotion") {
    add(click.from, tint(HIGHLIGHT.selected));
    add(click.to, tint(HIGHLIGHT.selected));
  }
  if (lastMove) {
    add(lastMove.from, tint(HIGHLIGHT.lastMove));
    add(lastMove.to, tint(HIGHLIGHT.lastMove));
  }

  const styles: Record<string, CSSProperties> = {};
  for (const [square, list] of Object.entries(layers)) styles[square] = { backgroundImage: list.join(", ") };
  return styles;
}
