import type { EngineWorker } from "./StockfishEngine";

/**
 * Path of the engine script inside /public. scripts/copy-engine.mjs copies it
 * there from node_modules/stockfish after every `npm install`.
 * The script loads its matching .wasm file from the same folder by itself.
 */
export const ENGINE_URL = "/engine/stockfish-19-lite-single.js";

/** Starts Stockfish in a Web Worker. Browser only (call it from client code). */
export function createStockfishWorker(): EngineWorker {
  return new Worker(ENGINE_URL) as unknown as EngineWorker;
}
