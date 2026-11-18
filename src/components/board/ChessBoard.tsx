"use client";

import type { CSSProperties } from "react";
import { Chessboard } from "react-chessboard";

/**
 * Our own board types. The rest of the app depends on these, not on
 * react-chessboard, so the library can later be swapped (e.g. for chessground)
 * by changing only this file.
 */
export type Orientation = "white" | "black";

export interface BoardArrow {
  from: string; // e.g. "e2"
  to: string; // e.g. "e4"
  color?: string;
}

export interface ChessBoardProps {
  /** Position to display, as a FEN string. */
  fen: string;
  orientation?: Orientation;
  /** Called with the square name ("e4") when a square is clicked. */
  onSquareClick?: (square: string) => void;
  /** Per-square CSS, used later for selection, move dots and capture rings. */
  squareStyles?: Record<string, CSSProperties>;
  arrows?: BoardArrow[];
}

export function ChessBoard({
  fen,
  orientation = "white",
  onSquareClick,
  squareStyles,
  arrows = [],
}: ChessBoardProps) {
  return (
    <Chessboard
      options={{
        id: "main-board",
        position: fen,
        boardOrientation: orientation,
        // Click-to-move is the main input (brief §8), so dragging stays off for now.
        allowDragging: false,
        squareStyles,
        arrows: arrows.map((a) => ({
          startSquare: a.from,
          endSquare: a.to,
          color: a.color ?? "rgba(0, 128, 0, 0.8)",
        })),
        onSquareClick: ({ square }) => onSquareClick?.(square),
      }}
    />
  );
}
