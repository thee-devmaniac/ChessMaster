import { describe, expect, it } from "vitest";
import { parseBestMove, parseInfoLine } from "./uci";

// These lines were copied from real Stockfish 19 output.
describe("parseInfoLine", () => {
  it("parses a centipawn score and the principal variation", () => {
    const line =
      "info depth 12 seldepth 20 multipv 1 score cp -2521 nodes 4597 nps 72968 hashfull 3 time 63 pv g7g6 a2a4 h7h6";
    expect(parseInfoLine(line)).toEqual({
      depth: 12,
      multipv: 1,
      score: { type: "cp", value: -2521 },
      pv: ["g7g6", "a2a4", "h7h6"],
    });
  });

  it("parses a mate score", () => {
    const line =
      "info depth 12 seldepth 2 multipv 1 score mate 1 nodes 396 nps 396000 hashfull 0 time 1 pv d8d1";
    expect(parseInfoLine(line)?.score).toEqual({ type: "mate", value: 1 });
  });

  it("parses 'mate 0' (side to move is already checkmated) with an empty pv", () => {
    expect(parseInfoLine("info depth 0 score mate 0")).toEqual({
      depth: 0,
      multipv: 1,
      score: { type: "mate", value: 0 },
      pv: [],
    });
  });

  it("reads which line it is when the engine reports several (MultiPV)", () => {
    expect(parseInfoLine("info depth 10 multipv 2 score cp 10 pv d2d4")).toEqual({
      depth: 10,
      multipv: 2,
      score: { type: "cp", value: 10 },
      pv: ["d2d4"],
    });
  });

  it("ignores lines without a score and bound scores", () => {
    expect(parseInfoLine("info string NNUE evaluation using nn-xxx.nnue")).toBeNull();
    expect(parseInfoLine("info depth 5 currmove e2e4 currmovenumber 1")).toBeNull();
    expect(parseInfoLine("info depth 10 score cp 30 lowerbound nodes 100 pv e2e4")).toBeNull();
    expect(parseInfoLine("bestmove e2e4")).toBeNull();
  });
});

describe("parseBestMove", () => {
  it("reads the move and ignores ponder", () => {
    expect(parseBestMove("bestmove g7g6 ponder a2a4")).toBe("g7g6");
  });
  it("reads a promotion move", () => {
    expect(parseBestMove("bestmove e7e8q")).toBe("e7e8q");
  });
  it("returns null when there is no legal move", () => {
    expect(parseBestMove("bestmove (none)")).toBeNull();
  });
  it("returns undefined for other lines", () => {
    expect(parseBestMove("readyok")).toBeUndefined();
  });
});
