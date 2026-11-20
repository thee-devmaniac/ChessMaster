import { describe, expect, it } from "vitest";
import { importPgn } from "@/lib/chess/rules";
import type { GameRecord } from "@/lib/chess/game";
import type { ReviewedMove } from "./classify";
import { hasClockData, lowTimeThreshold, moveTimings, rushedThreshold, sideTimeReport, timeInsights } from "./time";

/**
 * A made-up 3+2 blitz game in Chess.com's format (Scholar's mate).
 * Black thinks for a long time on move 2, then rushes 3...Nf6?? in time trouble.
 * Clocks are recorded AFTER the 2-second increment is added.
 */
const PGN = `[TimeControl "180+2"]

1. e4 {[%clk 0:03:01]} 1... e5 {[%clk 0:03:00]} 2. Qh5 {[%clk 0:02:55]}
2... Nc6 {[%clk 0:00:25]} 3. Bc4 {[%clk 0:02:50]} 3... Nf6 {[%clk 0:00:26]} 4. Qxf7# {[%clk 0:02:49]} 1-0`;

function load(pgn: string): GameRecord {
  const r = importPgn(pgn);
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

const game = load(PGN);
const timings = moveTimings(game);

describe("importPgn keeps clock data", () => {
  it("attaches the clock to every move and reads the time control", () => {
    expect(game.timeControl).toEqual({ baseMs: 180_000, incMs: 2_000 });
    expect(game.moves.map((m) => m.clockMs)).toEqual([181_000, 180_000, 175_000, 25_000, 170_000, 26_000, 169_000]);
    expect(hasClockData(game)).toBe(true);
  });

  it("works without clocks too", () => {
    const plain = load("1. e4 e5 2. Nf3");
    expect(plain.moves[0].clockMs).toBeUndefined();
    expect(hasClockData(plain)).toBe(false);
    expect(moveTimings(plain).every((t) => t.spentMs === undefined)).toBe(true);
  });
});

describe("moveTimings", () => {
  it("works out each move's time from the same side's previous clock, plus the increment", () => {
    // White 1. e4: 180 - 181 + 2 = 1s. Black 2... Nc6: 180 - 25 + 2 = 157s.
    expect(timings.map((t) => t.spentMs)).toEqual([1_000, 2_000, 8_000, 157_000, 7_000, 1_000, 3_000]);
    expect(timings.map((t) => t.mover).join("")).toBe("wbwbwbw");
  });

  it("flags time trouble and rushed moves", () => {
    const nf6 = timings[5]; // 3... Nf6: 26s left, played in 1s
    expect(nf6.lowTime).toBe(true);
    expect(nf6.rushed).toBe(true);
    expect(timings[2]).toMatchObject({ lowTime: false, rushed: false }); // 2. Qh5: 2:55 left, 8s
  });
});

describe("thresholds scale with the time control", () => {
  it("uses 30s / 3s for blitz and less for bullet", () => {
    expect(lowTimeThreshold({ baseMs: 180_000, incMs: 2_000 })).toBe(30_000);
    expect(lowTimeThreshold({ baseMs: 60_000, incMs: 0 })).toBe(15_000); // 1-minute bullet
    expect(rushedThreshold({ baseMs: 60_000, incMs: 0 })).toBe(1_000);
    expect(rushedThreshold(undefined)).toBe(3_000);
  });
});

describe("side reports and insights", () => {
  const nf6Blunder = { ply: 6, classification: "blunder" } as ReviewedMove;
  const reviewed = new Map([[6, nf6Blunder]]);
  const black = sideTimeReport(timings, "b", reviewed);

  it("links the clock to the review's verdicts", () => {
    expect(black).toMatchObject({ timedMoves: 3, errors: 1, errorsInLowTime: 1, rushedErrors: 1, finalClockMs: 26_000 });
    expect(black.longestThink).toEqual({ ply: 4, spentMs: 157_000 });
  });

  it("explains it in plain words, including the counter-check advice", () => {
    const lines = timeInsights(black, game.timeControl, (ply) => (ply === 4 ? "2... Nc6" : "?"), true);
    expect(lines).toEqual([
      "Black: 1 of 1 mistake or blunder came with less than 30s on the clock.",
      "Black: 1 mistake was played in under 3s. A quick counter-check (checks, captures, threats) before moving might have caught it.",
      "Black's longest think: 2m 37s on 2... Nc6.",
    ]);
  });

  it("says nothing about mistakes before the game is reviewed", () => {
    const unreviewed = sideTimeReport(timings, "w", new Map());
    expect(timeInsights(unreviewed, game.timeControl, () => "", false)).toEqual([]);
  });
});
