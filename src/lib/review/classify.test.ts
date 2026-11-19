import { describe, expect, it } from "vitest";
import type { Analysis, Score } from "@/lib/engine/types";
import { newSession, recordOf, sessionReducer, fenAt, type GameRecord } from "@/lib/chess/game";
import { ROOT, lineThrough } from "@/lib/chess/tree";
import {
  BLUNDER_CP,
  EVAL_CAP_CP,
  INACCURACY_CP,
  MISTAKE_CP,
  centipawnLoss,
  classify,
  reviewMoves,
  scoreToCp,
  summarise,
  worstMoves,
} from "./classify";

const cp = (n: number): Score => ({ type: "cp", cp: n });
const mate = (winner: "w" | "b", moves: number): Score => ({ type: "mate", winner, moves });

describe("scoreToCp", () => {
  it("passes centipawns through and turns mates into big numbers", () => {
    expect(scoreToCp(cp(-80))).toBe(-80);
    expect(scoreToCp(mate("w", 3))).toBe(9997);
    expect(scoreToCp(mate("b", 1))).toBe(-9999);
    expect(scoreToCp(mate("w", 0))).toBe(10000); // already checkmated
  });
});

describe("centipawnLoss: sign convention for both colours", () => {
  it("White: going from +1.00 to -0.50 loses 150", () => {
    expect(centipawnLoss(cp(100), cp(-50), "w")).toBe(150);
  });

  it("Black: going from -1.00 (good for Black) to +0.50 loses 150", () => {
    expect(centipawnLoss(cp(-100), cp(50), "b")).toBe(150);
  });

  it("the same change in numbers is a gain for the other side, so the loss is 0", () => {
    expect(centipawnLoss(cp(100), cp(-50), "b")).toBe(0);
    expect(centipawnLoss(cp(-100), cp(50), "w")).toBe(0);
  });

  it("never goes negative when the engine's view improves after a move", () => {
    expect(centipawnLoss(cp(20), cp(60), "w")).toBe(0);
  });
});

describe("centipawnLoss: mates are capped", () => {
  it("allowing a mate in one from an equal position is a capped blunder", () => {
    expect(centipawnLoss(cp(-30), mate("w", 1), "b")).toBe(EVAL_CAP_CP);
  });

  it("finding a slower mate instead of a faster one is not a mistake", () => {
    expect(centipawnLoss(mate("w", 2), mate("w", 4), "w")).toBe(0);
  });

  it("delivering checkmate loses nothing", () => {
    expect(centipawnLoss(mate("w", 1), mate("w", 0), "w")).toBe(0);
  });

  it("throwing away a forced mate for a merely good position still counts", () => {
    expect(centipawnLoss(mate("w", 3), cp(200), "w")).toBe(EVAL_CAP_CP - 200);
  });
});

describe("classify", () => {
  it("uses the thresholds", () => {
    expect(classify(INACCURACY_CP - 1)).toBe("good");
    expect(classify(INACCURACY_CP)).toBe("inaccuracy");
    expect(classify(MISTAKE_CP)).toBe("mistake");
    expect(classify(BLUNDER_CP)).toBe("blunder");
  });
});

/** Builds a line of moves from UCI strings. */
function play(ucis: string[]): GameRecord {
  const s = ucis.reduce(
    (acc, u) => sessionReducer(acc, { type: "play", move: { from: u.slice(0, 2), to: u.slice(2, 4) } }),
    newSession(),
  );
  return recordOf(s.tree, lineThrough(s.tree, ROOT));
}

describe("reviewMoves on Scholar's mate", () => {
  // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7#
  const game = play(["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"]);
  // Hand-made engine results, one per position (White's point of view).
  const scores: Score[] = [cp(30), cp(30), cp(30), cp(-20), cp(10), cp(-20), mate("w", 1), mate("w", 0)];
  const best = ["e2e4", "g1f3", "b1c3", "g7g6", "g8f6", "d8e7", "h5f7", null];
  const analyses: Analysis[] = scores.map((score, i) => ({
    fen: fenAt(game, i),
    depth: 14,
    score,
    bestMove: best[i],
    pv: [],
  }));
  const reviewed = reviewMoves(game, analyses);

  it("marks Nf6 as Black's blunder, with Qe7 as the better move", () => {
    const nf6 = reviewed[5];
    expect(nf6).toMatchObject({ ply: 6, san: "Nf6", mover: "b", classification: "blunder", bestMoveSan: "Qe7" });
  });

  it("marks moves that match the engine as best with zero loss", () => {
    expect(reviewed[0]).toMatchObject({ san: "e4", isBest: true, loss: 0, classification: "good" });
    expect(reviewed[6]).toMatchObject({ san: "Qxf7#", isBest: true, loss: 0 });
  });

  it("summarises per side and lists the worst moves first", () => {
    expect(summarise(reviewed, "b")).toMatchObject({ moves: 3, blunders: 1 });
    expect(worstMoves(reviewed, "b")[0].san).toBe("Nf6");
    expect(worstMoves(reviewed, "w").every((r) => r.mover === "w")).toBe(true);
  });
});
