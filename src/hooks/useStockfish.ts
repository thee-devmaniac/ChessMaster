"use client";

import { useEffect, useState } from "react";
import { StockfishEngine } from "@/lib/engine/StockfishEngine";
import { createStockfishWorker } from "@/lib/engine/createStockfishWorker";

/**
 * Starts one Stockfish engine when the component appears and shuts it down
 * when it goes away. `engine` stays null until the engine has finished loading.
 * With `enabled` false no engine is started (and a running one is shut down),
 * which saves memory on phones when a feature that needs it is switched off.
 */
export function useStockfish(enabled = true) {
  const [engine, setEngine] = useState<StockfishEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const instance = new StockfishEngine(createStockfishWorker);
    let alive = true;
    instance
      .whenReady()
      .then(() => alive && setEngine(instance))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
      instance.dispose();
      setEngine(null);
    };
  }, [enabled]);

  return { engine: enabled ? engine : null, error };
}
