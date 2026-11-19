import { describe, expect, it } from "vitest";
import { AnalysisCache, positionKey } from "./cache";
import type { Analysis } from "./types";

const result = (fen: string, depth: number): Analysis => ({
  fen,
  depth,
  score: { type: "cp", cp: depth },
  bestMove: "e2e4",
  pv: [],
});

describe("AnalysisCache", () => {
  it("treats the same position with different move counters as one entry", () => {
    expect(positionKey("8/8/8/8/8/8/8/K6k w - - 0 1")).toBe(positionKey("8/8/8/8/8/8/8/K6k w - - 7 40"));
    expect(positionKey("8/8/8/8/8/8/8/K6k w - - 0 1")).not.toBe(positionKey("8/8/8/8/8/8/8/K6k b - - 0 1"));
  });

  it("returns a hit only if it is deep enough, and keeps the deepest result", () => {
    const cache = new AnalysisCache();
    const fen = "8/8/8/8/8/8/8/K6k w - - 0 1";
    cache.set(result(fen, 10));
    expect(cache.get(fen, 12)).toBeUndefined();
    cache.set(result(fen, 14));
    cache.set(result(fen, 8)); // shallower: ignored
    expect(cache.get(fen, 12)?.depth).toBe(14);
    expect(cache.size).toBe(1);
  });
});
