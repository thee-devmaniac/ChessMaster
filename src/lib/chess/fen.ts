import { Chess } from "chess.js";

/** The standard starting position. */
export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type FenCheck =
  | { ok: true; fen: string }
  | { ok: false; error: string };

/**
 * Checks a FEN string with chess.js before any part of the app uses it.
 * This is the only place outside src/lib/chess that needs to know chess.js
 * exists for FEN handling. The UI calls this function and nothing else.
 */
export function checkFen(input: string): FenCheck {
  const fen = input.trim();
  try {
    // The chess.js constructor throws on an invalid FEN (bad piece letters,
    // wrong number of ranks, two white kings, the side not to move in check, etc.).
    new Chess(fen);
    return { ok: true, fen };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid FEN" };
  }
}
