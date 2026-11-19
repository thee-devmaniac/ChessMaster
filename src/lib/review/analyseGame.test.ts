import { describe, expect, it } from "vitest";
import type { Analysis, SearchLimit } from "@/lib/engine/types";
import { AnalysisCache } from "@/lib/engine/cache";
import { AnalysisCancelledError } from "@/lib/engine/StockfishEngine";
import { newSession, sessionReducer, type GameRecord } from "@/lib/chess/game";
import { analyseGame, type Analyser } from "./analyseGame";

/** A fake engine that answers instantly and records what it was asked. */
class FakeAnalyser implements Analyser {
  asked: string[] = [];
  cancelled = false;
  async analyse(fen: string, limit: SearchLimit): Promise<Analysis> {
    if (this.cancelled) throw new AnalysisCancelledError();
    this.asked.push(fen);
    return { fen, depth: "depth" in limit ? limit.depth : 0, score: { type: "cp", cp: 0 }, bestMove: null, pv: [] };
  }
  cancel() {
    this.cancelled = true;
  }
}

function game(ucis: string[]): GameRecord {
  return ucis.reduce(
    (s, u) => sessionReducer(s, { type: "play", move: { from: u.slice(0, 2), to: u.slice(2, 4) } }),
    newSession(),
  ).game;
}

const G = game(["e2e4", "e7e5", "g1f3"]); // 3 moves -> 4 positions

describe("analyseGame", () => {
  it("analyses every position in order and reports progress", async () => {
    const engine = new FakeAnalyser();
    const progress: string[] = [];
    const result = await analyseGame(engine, G, {
      depth: 12,
      cache: new AnalysisCache(),
      onProgress: (d, t) => progress.push(`${d}/${t}`),
    });
    expect(result).toHaveLength(4);
    expect(engine.asked).toHaveLength(4);
    expect(progress).toEqual(["1/4", "2/4", "3/4", "4/4"]);
  });

  it("uses the cache, so a second review asks the engine nothing", async () => {
    const cache = new AnalysisCache();
    await analyseGame(new FakeAnalyser(), G, { depth: 12, cache });
    const second = new FakeAnalyser();
    const result = await analyseGame(second, G, { depth: 12, cache });
    expect(result).toHaveLength(4);
    expect(second.asked).toHaveLength(0);
  });

  it("does not trust a cached result that is shallower than asked", async () => {
    const cache = new AnalysisCache();
    await analyseGame(new FakeAnalyser(), G, { depth: 8, cache });
    const deeper = new FakeAnalyser();
    await analyseGame(deeper, G, { depth: 14, cache });
    expect(deeper.asked).toHaveLength(4);
  });

  it("returns null when cancelled", async () => {
    const controller = new AbortController();
    const engine = new FakeAnalyser();
    const result = await analyseGame(engine, G, {
      depth: 12,
      cache: new AnalysisCache(),
      signal: controller.signal,
      onProgress: (done) => done === 2 && controller.abort(),
    });
    expect(result).toBeNull();
    expect(engine.asked).toHaveLength(2);
  });
});
