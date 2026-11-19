"use client";

import { useEffect, useState } from "react";
import { StockfishEngine } from "@/lib/engine/StockfishEngine";
import { createStockfishWorker } from "@/lib/engine/createStockfishWorker";

/**
 * Starts one Stockfish engine when the component appears and shuts it down
 * when it goes away. `engine` stays null until the engine has finished loading.
 */
export function useStockfish() {
  const [engine, setEngine] = useState<StockfishEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return { engine, error };
}
