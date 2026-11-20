/**
 * Reading clock information from PGN files.
 *
 * Chess.com and Lichess write the time left on the mover's clock after each
 * move as a comment: {[%clk 0:02:59.8]}. Lichess may add other tags in the same
 * comment ({ [%eval 0.2] [%clk 0:09:58] }), so we search for the %clk tag.
 * The game's time control is in a header: [TimeControl "180+2"] means 180
 * seconds each, plus 2 seconds added after every move (the "increment").
 */

export interface TimeControl {
  /** Starting time for each player, in milliseconds. */
  baseMs: number;
  /** Time added after each move, in milliseconds. */
  incMs: number;
}

/** "[%clk 0:02:59.8]" anywhere in a comment -> 179800 (ms). Undefined if there is no clock tag. */
export function parseClockComment(comment: string | undefined): number | undefined {
  if (!comment) return undefined;
  const m = comment.match(/\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/);
  if (!m) return undefined;
  const [, h, min, s] = m;
  return Math.round((Number(h) * 3600 + Number(min) * 60 + Number(s)) * 1000);
}

/**
 * "180+2" -> { baseMs: 180000, incMs: 2000 }; "600" -> no increment.
 * Undefined for games without a normal clock: "-" (no limit) or
 * correspondence games ("1/259200", days per move), which this analysis doesn't cover.
 */
export function parseTimeControl(header: string | undefined): TimeControl | undefined {
  const m = header?.trim().match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return undefined;
  return { baseMs: Number(m[1]) * 1000, incMs: Number(m[2] ?? 0) * 1000 };
}

/** 179800 -> "2:59.8"; 9000 -> "0:09"; 3725000 -> "1:02:05". Tenths only under a minute, where they matter. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = totalSeconds < 60 && s % 1 !== 0 ? s.toFixed(1).padStart(4, "0") : String(Math.floor(s)).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 2400 -> "2.4s"; 75000 -> "1m 15s". For how long a move took. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  if (s < 10) return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`; // "3s", but "2.4s"
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return rest === 0 ? `${m}m` : `${m}m ${rest}s`;
}
