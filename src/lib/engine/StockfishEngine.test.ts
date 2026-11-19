import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisCancelledError, StockfishEngine, type EngineWorker } from "./StockfishEngine";

/**
 * A fake worker: records what the engine wrapper sends, and lets the test
 * play the part of Stockfish by "emitting" lines back.
 */
class FakeWorker implements EngineWorker {
  sent: string[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminated = false;

  postMessage(msg: string) {
    this.sent.push(msg);
    // Answer the handshake automatically, like the real engine.
    if (msg === "uci") this.emit("uciok");
    if (msg === "isready") this.emit("readyok");
  }
  emit(line: string) {
    queueMicrotask(() => this.onmessage?.({ data: line }));
  }
  terminate() {
    this.terminated = true;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const WHITE_TO_MOVE = "r3r1k1/ppppqppp/8/8/8/8/5PPP/R5K1 w - - 0 1";
const BLACK_TO_MOVE = "r5k1/5ppp/8/8/8/8/PPPPQPPP/R3R1K1 b - - 0 1";

describe("StockfishEngine", () => {
  let worker: FakeWorker;
  let engine: StockfishEngine;

  beforeEach(async () => {
    worker = new FakeWorker();
    engine = new StockfishEngine(() => worker);
    await engine.whenReady();
  });

  it("does the UCI handshake", () => {
    expect(worker.sent).toEqual(["uci", "isready"]);
  });

  it("sends the position and a depth limit, and resolves with the last info line", async () => {
    const result = engine.analyse(WHITE_TO_MOVE, { depth: 12 });
    await flush();
    expect(worker.sent.slice(-2)).toEqual([`position fen ${WHITE_TO_MOVE}`, "go depth 12"]);

    worker.emit("info depth 11 multipv 1 score cp -2400 pv f2f3");
    worker.emit("info depth 12 multipv 1 score cp -2541 pv f2f3 e7e3");
    worker.emit("bestmove f2f3 ponder e7e3");

    expect(await result).toEqual({
      fen: WHITE_TO_MOVE,
      depth: 12,
      score: { type: "cp", cp: -2541 }, // White to move: sign unchanged
      bestMove: "f2f3",
      pv: ["f2f3", "e7e3"],
    });
  });

  it("converts to White's point of view when Black is to move", async () => {
    const result = engine.analyse(BLACK_TO_MOVE, { depth: 12 });
    await flush();
    worker.emit("info depth 12 multipv 1 score cp -2521 pv g7g6");
    worker.emit("bestmove g7g6");
    expect((await result).score).toEqual({ type: "cp", cp: 2521 }); // White is winning
  });

  it("supports a time limit", async () => {
    engine.analyse(WHITE_TO_MOVE, { movetimeMs: 500 });
    await flush();
    expect(worker.sent.at(-1)).toBe("go movetime 500");
  });

  it("reports progress through onInfo", async () => {
    const depths: number[] = [];
    const result = engine.analyse(WHITE_TO_MOVE, { depth: 2 }, (p) => depths.push(p.depth));
    await flush();
    worker.emit("info depth 1 multipv 1 score cp 10 pv e2e4");
    worker.emit("info depth 2 multipv 1 score cp 20 pv e2e4");
    worker.emit("bestmove e2e4");
    await result;
    expect(depths).toEqual([1, 2]);
  });

  it("handles a checkmated position (bestmove (none))", async () => {
    const mated = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const result = engine.analyse(mated, { depth: 12 });
    await flush();
    worker.emit("info depth 0 score mate 0");
    worker.emit("bestmove (none)");
    const a = await result;
    expect(a.bestMove).toBeNull();
    expect(a.score).toEqual({ type: "mate", winner: "b", moves: 0 });
  });

  it("a new request cancels the running one and starts after its bestmove", async () => {
    const first = engine.analyse(WHITE_TO_MOVE, { depth: 20 });
    // Attach the expectation now, before the rejection happens.
    const firstCancelled = expect(first).rejects.toBeInstanceOf(AnalysisCancelledError);
    await flush();
    const second = engine.analyse(BLACK_TO_MOVE, { depth: 12 });
    await flush();

    await firstCancelled;
    expect(worker.sent.at(-1)).toBe("stop");

    // Stockfish answers the stop with a bestmove for the OLD search. It must be ignored.
    worker.emit("info depth 9 multipv 1 score cp 55 pv e2e4");
    worker.emit("bestmove e2e4");
    await flush();
    expect(worker.sent.slice(-2)).toEqual([`position fen ${BLACK_TO_MOVE}`, "go depth 12"]);

    worker.emit("info depth 12 multipv 1 score cp -2521 pv g7g6");
    worker.emit("bestmove g7g6");
    const a = await second;
    expect(a.fen).toBe(BLACK_TO_MOVE);
    expect(a.bestMove).toBe("g7g6");
  });

  it("dispose() terminates the worker", () => {
    engine.dispose();
    expect(worker.terminated).toBe(true);
  });
});
