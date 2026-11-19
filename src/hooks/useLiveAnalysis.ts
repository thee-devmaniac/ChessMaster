"use client";

import { useEffect, useState } from "react";
import { AnalysisCancelledError, type StockfishEngine } from "@/lib/engine/StockfishEngine";
import type { AnalysisCache } from "@/lib/engine/cache";
import type { Score } from "@/lib/engine/types";

/** How long the engine thinks about the position on screen. */
export const LIVE_MOVETIME_MS = 1500;
/** A cached result at least this deep is shown as-is, without thinking again. */
export const LIVE_MIN_CACHED_DEPTH = 12;

export interface LiveEval {
  fen: string;
  depth: number;
  /** White's point of view. */
  score: Score;
  /** Best move found so far (UCI), or null if there is no legal move. */
  bestMove: string | null;
  pv: string[];
  /** False while the engine is still thinking and the numbers may change. */
  final: boolean;
}

/**
 * Analyses whatever position is on screen. When `fen` changes, the old search
 * is abandoned (the engine's "latest request wins" rule) and a new one starts.
 */
export function useLiveAnalysis(
  engine: StockfishEngine | null,
  cache: AnalysisCache,
  fen: string,
  enabled: boolean,
): LiveEval | null {
  const [live, setLive] = useState<LiveEval | null>(null);
  const cached = cache.get(fen, LIVE_MIN_CACHED_DEPTH);

  useEffect(() => {
    if (!engine || !enabled || cached) return;
    let active = true; // becomes false when the position changes or the page closes

    engine
      .analyse(fen, { movetimeMs: LIVE_MOVETIME_MS }, (p) => {
        if (active) setLive({ fen, depth: p.depth, score: p.score, pv: p.pv, bestMove: p.pv[0] ?? null, final: false });
      })
      .then((a) => {
        cache.set(a);
        if (active) setLive({ fen, depth: a.depth, score: a.score, pv: a.pv, bestMove: a.bestMove, final: true });
      })
      .catch((e) => {
        if (!(e instanceof AnalysisCancelledError)) console.error(e);
      });

    return () => {
      active = false;
      engine.cancel();
    };
  }, [engine, cache, fen, enabled, cached]);

  if (!enabled) return null;
  if (cached) return { fen, depth: cached.depth, score: cached.score, pv: cached.pv, bestMove: cached.bestMove, final: true };
  // Only show results that belong to the position on screen.
  return live?.fen === fen ? live : null;
}
