import { EVAL_CAP_CP, centipawnLoss, classify, type Classification } from "@/lib/review/classify";
import { scoreFor } from "@/lib/bot/levels";
import { uciToSan } from "@/lib/chess/rules";
import type { Analysis, Color, Score } from "@/lib/engine/types";

/** How deep the coach looks: deeper than the weaker bots, so its advice can be trusted. */
export const COACH_DEPTH = 12;
/** ...but never longer than this per position, so the coach answers quickly even on slow phones. */
export const COACH_MAX_MS = 1500;
/** A threat counts when it would gain the bot at least this much (centipawns). */
export const THREAT_CP = 150;
/** The bot "slipped" when its move gave the player at least this much (centipawns). */
export const SLIP_CP = 200;

export interface CoachVerdict {
  classification: Classification;
  /** Centipawns the move gave away compared with the best move (same scale as the review). */
  loss: number;
  /** The player found the engine's own choice. */
  isBest: boolean;
  /** The engine's choice in the position before the move, in standard notation. */
  bestSan: string | null;
  bestUci: string | null;
  message: string;
}

const pawns = (cp: number) => (cp / 100).toFixed(1);

/**
 * Judges the player's move with the same thresholds as the game review, so
 * the coach and the review never disagree. `before` is the engine's analysis
 * of the position before the move, `after` of the position after it.
 */
export function judgeMove(fenBefore: string, uci: string, before: Analysis, after: Analysis, mover: Color): CoachVerdict {
  const loss = centipawnLoss(before.score, after.score, mover);
  const classification = classify(loss);
  const isBest = before.bestMove === uci;
  const bestSan = before.bestMove ? uciToSan(fenBefore, before.bestMove) : null;
  let message: string;
  switch (classification) {
    case "good":
      message = isBest ? "Excellent! That's the engine's top move." : "Good move.";
      break;
    case "inaccuracy":
      message = `Playable, but not the most accurate: about ${pawns(loss)} pawns weaker than the best move.`;
      break;
    case "mistake":
      message = `A mistake: it gives away about ${pawns(loss)} pawns.`;
      break;
    case "blunder":
      message =
        loss >= EVAL_CAP_CP
          ? "A blunder: this throws away the game, or lets the bot attack your king hard."
          : `A blunder: it gives away about ${pawns(loss)} pawns.`;
      break;
  }
  return { classification, loss, isBest, bestSan, bestUci: before.bestMove, message };
}

/** Does the bot really threaten something? Compares the position with the bot to move again against the real one. */
export function isRealThreat(real: Score, withBotToMove: Score, bot: Color): boolean {
  return scoreFor(withBotToMove, bot) - scoreFor(real, bot) >= THREAT_CP;
}

/** Did the bot's last move hand the player a chance? `prev` and `now` are evaluations before and after it. */
export function botSlipped(prev: Score, now: Score, player: Color): boolean {
  return scoreFor(now, player) - scoreFor(prev, player) >= SLIP_CP;
}
