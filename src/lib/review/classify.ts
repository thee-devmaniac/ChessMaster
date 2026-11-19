import type { Analysis, Color, Score } from "@/lib/engine/types";
import { fenAt, type GameRecord } from "@/lib/chess/game";
import { uciToSan } from "@/lib/chess/rules";
import { sideToMove } from "@/lib/engine/score";

// ---- Thresholds (named constants, to be tuned later) ----
export const INACCURACY_CP = 50;
export const MISTAKE_CP = 100;
export const BLUNDER_CP = 300;
/** A mate is treated as this many centipawns (minus the moves to mate). */
export const MATE_CP = 10_000;
/**
 * Evaluations are clamped to ±10 pawns before comparing. Beyond that the
 * game is decided, so a "loss" from mate-in-3 to +15 is not a real mistake,
 * and one mate score cannot swamp everything else.
 */
export const EVAL_CAP_CP = 1000;

export type Classification = "good" | "inaccuracy" | "mistake" | "blunder";

/** The traditional chess annotation symbols. */
export const SYMBOL: Record<Classification, string> = {
  good: "",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

/** A score as one number, from White's point of view. */
export function scoreToCp(score: Score): number {
  if (score.type === "cp") return score.cp;
  const value = MATE_CP - score.moves; // a faster mate is worth slightly more
  return score.winner === "w" ? value : -value;
}

const clampEval = (cp: number) => Math.max(-EVAL_CAP_CP, Math.min(EVAL_CAP_CP, cp));

/**
 * How much the mover's position got worse because of their move.
 *
 * `before` is the evaluation of the position before the move, which is the
 * value of the best move. `after` is the evaluation after the move played.
 * Both are White's point of view, so for Black a rising number is bad news.
 */
export function centipawnLoss(before: Score, after: Score, mover: Color): number {
  const b = clampEval(scoreToCp(before));
  const a = clampEval(scoreToCp(after));
  const loss = mover === "w" ? b - a : a - b;
  return Math.min(EVAL_CAP_CP, Math.max(0, loss)); // never negative, capped
}

export function classify(loss: number): Classification {
  if (loss >= BLUNDER_CP) return "blunder";
  if (loss >= MISTAKE_CP) return "mistake";
  if (loss >= INACCURACY_CP) return "inaccuracy";
  return "good";
}

export interface ReviewedMove {
  /** Ply of the position AFTER this move, counted along the reviewed line. */
  ply: number;
  /** The move-tree node this verdict belongs to (set by the page). */
  id?: string;
  /** Full-move number as written in the game ("12" in "12... Nf6"). */
  moveNumber: number;
  san: string;
  mover: Color;
  evalBefore: Score;
  evalAfter: Score;
  loss: number;
  classification: Classification;
  /** True if the engine would have played the same move. */
  isBest: boolean;
  /** The engine's choice in the position before the move. */
  bestMoveUci: string | null;
  bestMoveSan: string | null;
}

/**
 * Turns per-position analyses into per-move verdicts.
 * `analyses[i]` must be the analysis of the position after i moves (0 = start).
 */
export function reviewMoves(game: GameRecord, analyses: Analysis[]): ReviewedMove[] {
  return game.moves.map((move, i) => {
    const before = analyses[i];
    const after = analyses[i + 1];
    const fenBefore = fenAt(game, i);
    const mover = sideToMove(fenBefore);
    const isBest = before.bestMove === move.uci;
    // If the player found the engine's move, any small difference is just engine noise.
    const loss = isBest ? 0 : centipawnLoss(before.score, after.score, mover);
    return {
      ply: i + 1,
      moveNumber: Number(fenBefore.split(" ")[5]) || 1,
      san: move.san,
      mover,
      evalBefore: before.score,
      evalAfter: after.score,
      loss,
      classification: classify(loss),
      isBest,
      bestMoveUci: before.bestMove,
      bestMoveSan: before.bestMove ? uciToSan(fenBefore, before.bestMove) : null,
    };
  });
}

export interface SideSummary {
  moves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  /** Average centipawn loss: lower is better. Strong players are often under 30. */
  averageLoss: number;
}

export function summarise(reviewed: ReviewedMove[], color: Color): SideSummary {
  const mine = reviewed.filter((r) => r.mover === color);
  const count = (c: Classification) => mine.filter((r) => r.classification === c).length;
  const total = mine.reduce((sum, r) => sum + r.loss, 0);
  return {
    moves: mine.length,
    inaccuracies: count("inaccuracy"),
    mistakes: count("mistake"),
    blunders: count("blunder"),
    averageLoss: mine.length ? Math.round(total / mine.length) : 0,
  };
}

/** The worst moves first, leaving out good ones. */
export function worstMoves(reviewed: ReviewedMove[], color?: Color, limit = 10): ReviewedMove[] {
  return reviewed
    .filter((r) => r.classification !== "good" && (!color || r.mover === color))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, limit);
}
