import type { Analysis, SearchLimit } from "@/lib/engine/types";
import { AnalysisCancelledError } from "@/lib/engine/StockfishEngine";
import type { AnalysisCache } from "@/lib/engine/cache";
import { fenAt, type GameRecord } from "@/lib/chess/game";

/** The default review depth: deep enough to catch tactics, quick enough for a whole game. */
export const DEFAULT_REVIEW_DEPTH = 14;

/** What the review needs from an engine. StockfishEngine fits; tests pass a fake. */
export interface Analyser {
  analyse(fen: string, limit: SearchLimit): Promise<Analysis>;
  cancel(): void;
}

export interface AnalyseGameOptions {
  depth: number;
  cache: AnalysisCache;
  /** Called after each position: (done, total). */
  onProgress?: (done: number, total: number) => void;
  /** Abort to stop the review early. */
  signal?: AbortSignal;
}

/**
 * Analyses every position of the game in order, from the start to the final
 * position, at a fixed depth so results are consistent from move to move.
 * Returns null if it was cancelled.
 */
export async function analyseGame(
  analyser: Analyser,
  game: GameRecord,
  { depth, cache, onProgress, signal }: AnalyseGameOptions,
): Promise<Analysis[] | null> {
  const total = game.moves.length + 1; // every position, including the start
  const results: Analysis[] = [];
  const stop = () => analyser.cancel();
  signal?.addEventListener("abort", stop);

  try {
    for (let ply = 0; ply < total; ply++) {
      if (signal?.aborted) return null;
      const fen = fenAt(game, ply);
      let analysis = cache.get(fen, depth);
      if (!analysis) {
        analysis = await analyser.analyse(fen, { depth });
        cache.set(analysis);
      }
      results.push(analysis);
      onProgress?.(ply + 1, total);
    }
    return results;
  } catch (e) {
    if (e instanceof AnalysisCancelledError) return null;
    throw e;
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}
