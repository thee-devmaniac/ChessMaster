import { describe, expect, it } from "vitest";
import { formatScore, sideToMove, toWhitePov } from "./score";

describe("sideToMove", () => {
  it("reads the second FEN field", () => {
    expect(sideToMove("8/8/8/8/8/8/8/K6k w - - 0 1")).toBe("w");
    expect(sideToMove("8/8/8/8/8/8/8/K6k b - - 0 1")).toBe("b");
  });
});

// The sign convention: Stockfish scores from the SIDE TO MOVE, we show WHITE's view.
describe("toWhitePov: centipawns", () => {
  it("keeps the sign when White is to move", () => {
    expect(toWhitePov({ type: "cp", value: 150 }, "w")).toEqual({ type: "cp", cp: 150 });
    expect(toWhitePov({ type: "cp", value: -150 }, "w")).toEqual({ type: "cp", cp: -150 });
  });

  it("flips the sign when Black is to move", () => {
    // Real case: White is a queen up, Black to move, Stockfish says cp -2521.
    expect(toWhitePov({ type: "cp", value: -2521 }, "b")).toEqual({ type: "cp", cp: 2521 });
    expect(toWhitePov({ type: "cp", value: 300 }, "b")).toEqual({ type: "cp", cp: -300 });
  });
});

describe("toWhitePov: mate", () => {
  it("positive mate = the side to move wins", () => {
    expect(toWhitePov({ type: "mate", value: 3 }, "w")).toEqual({ type: "mate", winner: "w", moves: 3 });
    expect(toWhitePov({ type: "mate", value: 1 }, "b")).toEqual({ type: "mate", winner: "b", moves: 1 });
  });

  it("negative mate = the side to move gets mated", () => {
    expect(toWhitePov({ type: "mate", value: -2 }, "w")).toEqual({ type: "mate", winner: "b", moves: 2 });
    expect(toWhitePov({ type: "mate", value: -2 }, "b")).toEqual({ type: "mate", winner: "w", moves: 2 });
  });

  it("mate 0 = the side to move is already checkmated", () => {
    // e.g. after Fool's mate, White to move and checkmated: Black won.
    expect(toWhitePov({ type: "mate", value: 0 }, "w")).toEqual({ type: "mate", winner: "b", moves: 0 });
    expect(toWhitePov({ type: "mate", value: 0 }, "b")).toEqual({ type: "mate", winner: "w", moves: 0 });
  });
});

describe("formatScore", () => {
  it("shows centipawns as pawns with a sign", () => {
    expect(formatScore({ type: "cp", cp: 80 })).toBe("+0.80");
    expect(formatScore({ type: "cp", cp: -125 })).toBe("-1.25");
    expect(formatScore({ type: "cp", cp: 0 })).toBe("0.00");
  });
  it("shows mates", () => {
    expect(formatScore({ type: "mate", winner: "w", moves: 3 })).toBe("+M3");
    expect(formatScore({ type: "mate", winner: "b", moves: 2 })).toBe("-M2");
    expect(formatScore({ type: "mate", winner: "w", moves: 0 })).toBe("1-0");
    expect(formatScore({ type: "mate", winner: "b", moves: 0 })).toBe("0-1");
  });
});
