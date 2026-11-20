import type { UciInfo, UciScore } from "./types";

/**
 * Parses one "info" line, e.g.
 *   info depth 12 seldepth 20 multipv 1 score cp -2521 nodes 4597 ... pv g7g6 a2a4
 *
 * `multipv` says which of the top lines it is (1 = best); it is 1 when the
 * engine reports a single line.
 *
 * Returns null for lines we don't need: lines with no score (e.g. "info string ..."
 * or "info currmove ..."), and "lowerbound"/"upperbound" scores, which are only
 * temporary guesses made while the engine is still searching.
 */
export function parseInfoLine(line: string): UciInfo | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.trim().split(/\s+/);

  let depth: number | null = null;
  let multipv = 1;
  let score: UciScore | null = null;
  let pv: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "depth") {
      depth = Number(tokens[++i]);
    } else if (t === "multipv") {
      multipv = Number(tokens[++i]);
    } else if (t === "score") {
      const kind = tokens[++i];
      const value = Number(tokens[++i]);
      if (kind === "cp" || kind === "mate") score = { type: kind, value };
      if (tokens[i + 1] === "lowerbound" || tokens[i + 1] === "upperbound") return null;
    } else if (t === "pv") {
      pv = tokens.slice(i + 1); // pv is always the last field
      break;
    }
  }

  if (depth === null || Number.isNaN(depth) || score === null) return null;
  return { depth, multipv, score, pv };
}

/**
 * Parses "bestmove e2e4 ponder e7e5" -> "e2e4".
 * "bestmove (none)" (no legal moves: checkmate or stalemate) -> null.
 * Returns undefined if the line is not a bestmove line at all.
 */
export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith("bestmove")) return undefined;
  const move = line.trim().split(/\s+/)[1];
  return !move || move === "(none)" ? null : move;
}
