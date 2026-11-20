import type { GameRecord } from "@/lib/chess/game";
import type { TimeControl } from "@/lib/chess/clock";
import { formatDuration } from "@/lib/chess/clock";
import { sideToMove } from "@/lib/engine/score";
import type { Color } from "@/lib/engine/types";
import type { ReviewedMove } from "./classify";

// ---- Thresholds (named constants, to be tuned) ----
/** "Time trouble": less than this left on the clock... */
export const LOW_TIME_MS = 30_000;
/** ...or less than this share of the starting time, whichever is smaller (so a 1-minute game isn't always "in trouble"). */
export const LOW_TIME_FRACTION = 0.25;
/** "Rushed": a move played faster than this... */
export const RUSHED_MS = 3_000;
/** ...or faster than this share of the starting time, whichever is smaller (bullet players move in a second). */
export const RUSHED_FRACTION = 1 / 60;

export function lowTimeThreshold(tc?: TimeControl): number {
  return tc ? Math.min(LOW_TIME_MS, tc.baseMs * LOW_TIME_FRACTION) : LOW_TIME_MS;
}

export function rushedThreshold(tc?: TimeControl): number {
  return tc ? Math.min(RUSHED_MS, tc.baseMs * RUSHED_FRACTION) : RUSHED_MS;
}

export interface MoveTiming {
  /** Ply of the position after this move (same numbering as the review). */
  ply: number;
  mover: Color;
  /** Time left after the move, if the PGN recorded it. */
  clockMs?: number;
  /** How long the move took, if it can be worked out. */
  spentMs?: number;
  /** Played with little time left. */
  lowTime: boolean;
  /** Played very quickly. */
  rushed: boolean;
}

/** True if the game has clock times worth analysing. */
export function hasClockData(game: GameRecord): boolean {
  return game.moves.filter((m) => m.clockMs !== undefined).length >= 2;
}

/**
 * How long each move took. Each side has its own clock, so a move's time is
 * that side's previous clock reading minus this one, plus the increment
 * (which the site adds after the move, before recording the clock).
 * A side's first move is measured from the starting time, when the time
 * control is known.
 */
export function moveTimings(game: GameRecord): MoveTiming[] {
  const tc = game.timeControl;
  const inc = tc?.incMs ?? 0;
  const low = lowTimeThreshold(tc);
  const fast = rushedThreshold(tc);
  const previous: Record<Color, number | undefined> = { w: tc?.baseMs, b: tc?.baseMs };

  return game.moves.map((move, i) => {
    const mover = sideToMove(i === 0 ? game.startFen : game.moves[i - 1].fenAfter);
    const clockMs = move.clockMs;
    let spentMs: number | undefined;
    if (clockMs !== undefined && previous[mover] !== undefined) {
      spentMs = Math.max(0, previous[mover]! - clockMs + inc); // rounding can give tiny negatives
    }
    if (clockMs !== undefined) previous[mover] = clockMs;
    return {
      ply: i + 1,
      mover,
      clockMs,
      spentMs,
      lowTime: clockMs !== undefined && clockMs < low,
      rushed: spentMs !== undefined && spentMs < fast,
    };
  });
}

export interface SideTimeReport {
  color: Color;
  /** Moves whose time could be measured. */
  timedMoves: number;
  averageSpentMs: number;
  longestThink?: { ply: number; spentMs: number };
  /** Moves made in time trouble. */
  lowTimeMoves: number;
  /** Mistakes and blunders (inaccuracies are left out: too small to blame on the clock). */
  errors: number;
  errorsInLowTime: number;
  rushedErrors: number;
  finalClockMs?: number;
}

const isError = (r?: ReviewedMove) => r?.classification === "mistake" || r?.classification === "blunder";

/** Sums up one side's use of time; `reviewed` (by ply) links timing to the review's verdicts. */
export function sideTimeReport(timings: MoveTiming[], color: Color, reviewed: Map<number, ReviewedMove>): SideTimeReport {
  const mine = timings.filter((t) => t.mover === color);
  const timed = mine.filter((t) => t.spentMs !== undefined);
  const longest = timed.reduce<MoveTiming | undefined>((best, t) => (!best || t.spentMs! > best.spentMs! ? t : best), undefined);
  const errorsHere = mine.filter((t) => isError(reviewed.get(t.ply)));
  return {
    color,
    timedMoves: timed.length,
    averageSpentMs: timed.length ? timed.reduce((sum, t) => sum + t.spentMs!, 0) / timed.length : 0,
    longestThink: longest ? { ply: longest.ply, spentMs: longest.spentMs! } : undefined,
    lowTimeMoves: mine.filter((t) => t.lowTime).length,
    errors: errorsHere.length,
    errorsInLowTime: errorsHere.filter((t) => t.lowTime).length,
    rushedErrors: errorsHere.filter((t) => t.rushed).length,
    finalClockMs: [...mine].reverse().find((t) => t.clockMs !== undefined)?.clockMs,
  };
}

const NAME = { w: "White", b: "Black" } as const;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Plain-language findings for one side, most useful first. `moveName(ply)`
 * turns a ply into "14... Nf6" for the longest-think line. Before the game has
 * been reviewed (`reviewed` false), nothing is known about mistakes, so only
 * timing facts are given.
 */
export function timeInsights(
  r: SideTimeReport,
  tc: TimeControl | undefined,
  moveName: (ply: number) => string,
  reviewed: boolean,
): string[] {
  const lines: string[] = [];
  const low = formatDuration(lowTimeThreshold(tc));
  const fast = formatDuration(rushedThreshold(tc));
  const side = NAME[r.color];

  if (r.errors > 0 && r.errorsInLowTime > 0) {
    lines.push(
      `${side}: ${r.errorsInLowTime} of ${plural(r.errors, "mistake or blunder", "mistakes and blunders")} came with less than ${low} on the clock.`,
    );
  }
  if (r.rushedErrors > 0) {
    lines.push(
      `${side}: ${plural(r.rushedErrors, "mistake was", "mistakes were")} played in under ${fast}. A quick counter-check (checks, captures, threats) before moving might have caught ${r.rushedErrors === 1 ? "it" : "them"}.`,
    );
  }
  if (r.lowTimeMoves >= 5) {
    lines.push(`${side} played ${r.lowTimeMoves} moves in time trouble (under ${low}).`);
  }
  if (r.longestThink && r.longestThink.spentMs >= 20_000) {
    lines.push(`${side}'s longest think: ${formatDuration(r.longestThink.spentMs)} on ${moveName(r.longestThink.ply)}.`);
  }
  if (reviewed && lines.length === 0 && r.timedMoves > 0) {
    lines.push(`${side} used the clock well: no mistakes came from time trouble or rushing.`);
  }
  return lines;
}
