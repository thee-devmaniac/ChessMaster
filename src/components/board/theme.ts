/**
 * Board colours, in one place. They follow the Chess Concept Showcase
 * palette: ivory and slate squares, antique gold for "good / engine",
 * arc blue for "what comes next", crimson for "the move that went wrong".
 */
export const SQUARE = {
  light: "#E9E2CF", // warm ivory
  dark: "#4B5A73", // slate blue: dark enough for contrast, light enough for black pieces to stay visible
};

export const ARROW = {
  /** The engine's best move. */
  best: "rgba(212, 175, 55, 0.9)",
  /** The move actually played, when it was a mistake. */
  played: "rgba(155, 29, 48, 0.85)",
  /** The next move in a lesson. */
  next: "rgba(77, 168, 255, 0.85)",
  /** Other book moves in a lesson. */
  alt: "rgba(77, 168, 255, 0.35)",
};

export const HIGHLIGHT = {
  selected: "rgba(212, 175, 55, 0.7)",
  lastMove: "rgba(240, 208, 128, 0.55)", // strong enough to read as gold, not grey, on the slate squares
  dot: "rgba(11, 15, 26, 0.32)",
  check: "rgba(155, 29, 48, 0.85)",
};
