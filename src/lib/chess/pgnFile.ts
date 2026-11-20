/**
 * Reading PGN text that may hold MANY games: a user pasting several games, or
 * a .pgn file downloaded from Chess.com or Lichess (a month of games is one file).
 *
 * The list is built from the header lines only, which is fast even for
 * hundreds of games; each game's moves are read (with importPgn) when the user
 * picks it.
 */

/** The largest file we accept, so a wrong file can't freeze the page. */
export const MAX_PGN_BYTES = 5 * 1024 * 1024;

/** A header line looks like [White "Magnus"]: a tag name, a space, a quoted value. */
const HEADER = /^\[([A-Za-z][A-Za-z0-9_]*)\s+"(.*)"\]\s*$/;

/**
 * Splits PGN text into one string per game. A new game starts when a header
 * line follows move text. A clock comment such as {[%clk 0:09:58]} never looks
 * like a header, because of the "{" and the "%".
 */
export function splitPgnGames(text: string): string[] {
  const games: string[] = [];
  let current: string[] = [];
  let seenMoves = false;

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const isHeader = HEADER.test(line.trim());
    if (isHeader && seenMoves) {
      games.push(current.join("\n").trim());
      current = [];
      seenMoves = false;
    }
    current.push(line);
    if (!isHeader && line.trim() !== "") seenMoves = true;
  }
  const last = current.join("\n").trim();
  if (last) games.push(last);
  return games;
}

export interface PgnSummary {
  /** Position in the file, from 0. */
  index: number;
  white: string;
  black: string;
  /** "1-0", "0-1", "1/2-1/2" or "*". */
  result: string;
  date?: string;
  timeControl?: string;
  /** How the game ended, when the site recorded it ("won by checkmate"). */
  termination?: string;
  /** Number of full moves, read from the last move number. */
  moves: number;
  /** The game's own PGN text, ready for importPgn. */
  pgn: string;
}

/** Reads the header tags of one game into a plain object. */
export function readHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of pgn.split("\n")) {
    const m = line.trim().match(HEADER);
    if (m) headers[m[1]] = m[2];
  }
  return headers;
}

/** Counts full moves from the move numbers ("24." in "24. Kf1"), ignoring "24..." and anything inside comments. */
function countMoves(pgn: string): number {
  const movetext = pgn
    .split("\n")
    .filter((l) => !HEADER.test(l.trim()))
    .join(" ")
    .replace(/\{[^}]*\}/g, " "); // comments can contain numbers (clock times)
  let last = 0;
  for (const m of movetext.matchAll(/(\d+)\.(?!\.)/g)) last = Math.max(last, Number(m[1]));
  return last;
}

const known = (v?: string) => (v && v !== "?" && v !== "????.??.??" ? v : undefined);

export function summarisePgn(text: string): PgnSummary[] {
  return splitPgnGames(text).map((pgn, index) => {
    const h = readHeaders(pgn);
    return {
      index,
      white: known(h.White) ?? "White",
      black: known(h.Black) ?? "Black",
      result: h.Result ?? "*",
      date: known(h.Date),
      timeControl: known(h.TimeControl),
      termination: known(h.Termination),
      moves: countMoves(pgn),
      pgn,
    };
  });
}

/** "600" -> "10 min"; "900+10" -> "15 min + 10s"; "-" -> "no clock". */
export function describeTimeControl(tc?: string): string | undefined {
  if (!tc) return undefined;
  if (tc === "-") return "no clock";
  const m = tc.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return "correspondence";
  const minutes = Number(m[1]) / 60;
  const base = Number.isInteger(minutes) ? `${minutes} min` : `${minutes.toFixed(1)} min`;
  return m[2] && m[2] !== "0" ? `${base} + ${m[2]}s` : base;
}
