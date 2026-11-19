"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ARROW, SQUARE } from "./theme";

/** How long a piece takes to slide to its new square. Short, so clicking through a game never feels slow. */
const SLIDE_MS = 180;

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
  const reducedMotion = useReducedMotion();
  // While an arrow key is HELD (the browser repeats it), positions change every
  // few milliseconds; sliding would just lag behind. Animate single steps only.
  const [skimming, setSkimming] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.repeat && setSkimming(true);
    const up = () => setSkimming(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <Chessboard
      options={{
        id: "main-board",
        position: fen,
        boardOrientation: orientation,
        // Click-to-move is the main input (brief §8), so dragging stays off for now.
        allowDragging: false,
        showAnimations: !reducedMotion && !skimming,
        animationDurationInMs: SLIDE_MS,
        squareStyles,
        // Showcase theme: ivory and slate squares, gold-tinted coordinates.
        lightSquareStyle: { backgroundColor: SQUARE.light },
        darkSquareStyle: { backgroundColor: SQUARE.dark },
        lightSquareNotationStyle: { color: SQUARE.dark, fontFamily: "var(--font-mono), monospace" },
        darkSquareNotationStyle: { color: SQUARE.light, fontFamily: "var(--font-mono), monospace" },
        boardStyle: { borderRadius: "2px", boxShadow: "0 0 0 1px rgba(212,175,55,0.35), 0 18px 50px rgba(0,0,0,0.55)" },
        arrows: arrows.map((a) => ({
          startSquare: a.from,
          endSquare: a.to,
          color: a.color ?? ARROW.best,
        })),
        onSquareClick: ({ square }) => onSquareClick?.(square),
      }}
    />
  );
}
