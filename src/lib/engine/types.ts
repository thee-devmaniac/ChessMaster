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
}

/** How long to think: a fixed depth (consistent, good for review) or a time limit in ms (good for live use). */
export type SearchLimit = { depth: number } | { movetimeMs: number };
