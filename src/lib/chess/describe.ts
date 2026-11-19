import type { GameStatus } from "./rules";

const NAME = { w: "White", b: "Black" } as const;

/** A one-line, human description of the game status. */
export function describeStatus(s: GameStatus): string {
  switch (s.kind) {
    case "playing":
      return `${NAME[s.turn]} to move${s.inCheck ? " (in check!)" : ""}`;
    case "checkmate":
      return `Checkmate: ${NAME[s.winner]} wins`;
    case "stalemate":
      return "Stalemate: draw (the side to move has no legal move but is not in check)";
    case "draw":
      return `Draw by ${s.reason}`;
  }
}
