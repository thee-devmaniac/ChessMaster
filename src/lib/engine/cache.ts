import type { Analysis } from "./types";

/**
 * The cache key for a position: the first four FEN fields (pieces, side to
 * move, castling rights, en passant square). The last two fields are move
 * counters. They don't change what the best move is, so the same position
 * reached at move 10 or move 14 shares one cache entry.
 */
export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Remembers engine results per position, so stepping back and forth or
 * re-reviewing a game never repeats work. Keeps the deepest result seen.
 */
export class AnalysisCache {
  private map = new Map<string, Analysis>();

  /** A cached result at least `minDepth` deep, or undefined. */
  get(fen: string, minDepth = 0): Analysis | undefined {
    const hit = this.map.get(positionKey(fen));
    return hit && hit.depth >= minDepth ? hit : undefined;
  }

  set(analysis: Analysis): void {
    const key = positionKey(analysis.fen);
    const existing = this.map.get(key);
    if (!existing || analysis.depth >= existing.depth) this.map.set(key, analysis);
  }

  get size(): number {
    return this.map.size;
  }
}
