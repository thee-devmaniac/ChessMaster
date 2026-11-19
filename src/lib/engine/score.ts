import type { Color, Score, UciScore } from "./types";

/** Reads whose turn it is from a FEN (the second field). */
export function sideToMove(fen: string): Color {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/**
 * THE ONE PLACE where engine scores are converted to White's point of view.
 *
 * Stockfish always scores from the side to move. So if Black is to move and
 * Stockfish says "cp 150", Black is better, and from White's view that is -150.
 */
export function toWhitePov(score: UciScore, toMove: Color): Score {
  if (score.type === "cp") {
    return { type: "cp", cp: toMove === "w" ? score.value : -score.value };
  }
  // Mate: a positive value means the side to move delivers mate.
  // A value of 0 or below means the side to move gets mated (0 = already mated).
  // We can't flip the sign of 0, so we store the winner explicitly instead.
  const other: Color = toMove === "w" ? "b" : "w";
  return {
    type: "mate",
    winner: score.value > 0 ? toMove : other,
    moves: Math.abs(score.value),
  };
}

/** Formats a score for display: "+0.80", "-1.25", "0.00", "+M3", "-M2", "1-0", "0-1". */
export function formatScore(score: Score): string {
  if (score.type === "mate") {
    if (score.moves === 0) return score.winner === "w" ? "1-0" : "0-1";
    return `${score.winner === "w" ? "+" : "-"}M${score.moves}`;
  }
  const pawns = score.cp / 100;
  if (pawns === 0) return "0.00";
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}
