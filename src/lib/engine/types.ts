/** Which side is to move, as written in a FEN ("w" or "b"). */
export type Color = "w" | "b";

/**
 * A score exactly as Stockfish reports it: from the point of view of the
 * side to move. Never show this to the user directly. Convert it with
 * toWhitePov() in score.ts first.
 */
export type UciScore =
  | { type: "cp"; value: number } // centipawns, +100 ≈ one pawn better for the side to move
  | { type: "mate"; value: number }; // +3 = side to move mates in 3, -3 = gets mated in 3, 0 = is mated now

/**
 * A score from White's point of view. This is what the rest of the app uses.
 * Positive cp = White is better.
 */
export type Score =
  | { type: "cp"; cp: number }
  | { type: "mate"; winner: Color; moves: number }; // moves = 0 means the game is already over

/** One parsed "info ..." line from Stockfish. */
export interface UciInfo {
  depth: number;
  /** Which of the engine's top lines this is: 1 = best (only 1 unless MultiPV is set). */
  multipv: number;
  score: UciScore;
  /** Principal variation: the line the engine expects, in UCI notation ("e2e4"). */
  pv: string[];
}

/** The final result of analysing one position. */
export interface Analysis {
  fen: string;
  depth: number;
  /** White's point of view. */
  score: Score;
  /** Best move in UCI notation ("e2e4", "e7e8q"), or null if there are no legal moves. */
  bestMove: string | null;
  pv: string[];
  /**
   * The engine's top lines, best first, when more than one was asked for
   * (the `multiPv` option). Each has its score from White's point of view.
   */
  lines?: { score: Score; pv: string[] }[];
}

/** Extra search options. */
export interface AnalyseOptions {
  /** How many top lines to report (Stockfish's "MultiPV"). Default 1. */
  multiPv?: number;
}

/**
 * How long to think: a fixed depth (consistent, good for review) or a time
 * limit in ms (good for live use). A depth can also have `maxMs`: stop at
 * that depth or after that long, whichever comes first, so slow phones are
 * never kept waiting.
 */
export type SearchLimit = { depth: number; maxMs?: number } | { movetimeMs: number };
