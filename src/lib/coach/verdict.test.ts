import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "@/lib/chess/fen";
import type { Analysis, Score } from "@/lib/engine/types";
import { botSlipped, isRealThreat, judgeMove } from "./verdict";

const cp = (n: number): Score => ({ type: "cp", cp: n });
const analysis = (score: Score, bestMove: string | null = null): Analysis => ({ fen: "", depth: 12, score, bestMove, pv: [] });

describe("judgeMove", () => {
  it("praises the engine's own move", () => {
    const v = judgeMove(STARTING_FEN, "e2e4", analysis(cp(30), "e2e4"), analysis(cp(30)), "w");
    expect(v).toMatchObject({ classification: "good", isBest: true, bestSan: "e4" });
    expect(v.message).toBe("Excellent! That's the engine's top move.");
  });

  it("uses the review's thresholds and says how much was lost", () => {
    expect(judgeMove(STARTING_FEN, "a2a3", analysis(cp(30), "e2e4"), analysis(cp(-30)), "w").message).toBe(
      "Playable, but not the most accurate: about 0.6 pawns weaker than the best move.",
    );
    const mistake = judgeMove(STARTING_FEN, "f2f3", analysis(cp(30), "e2e4"), analysis(cp(-120)), "w");
    expect(mistake).toMatchObject({ classification: "mistake", bestSan: "e4" });
    expect(mistake.message).toBe("A mistake: it gives away about 1.5 pawns.");
  });

  it("judges Black's moves from Black's side", () => {
    // White's view rises from -20 to +400: bad for Black.
    const v = judgeMove(STARTING_FEN.replace(" w ", " b "), "e7e5", analysis(cp(-20), "e7e5"), analysis(cp(400)), "b");
    expect(v.classification).toBe("blunder");
  });

  it("explains a blunder into mate without a number", () => {
    const v = judgeMove(STARTING_FEN, "g2g4", analysis(cp(0), "e2e4"), analysis({ type: "mate", winner: "b", moves: 1 }), "w");
    expect(v.message).toBe("A blunder: this throws away the game, or lets the bot attack your king hard.");
  });
});

describe("threats and slips", () => {
  it("counts a threat only when it would gain the bot enough", () => {
    expect(isRealThreat(cp(0), cp(-200), "b")).toBe(true); // bot is Black: -200 is good for it
    expect(isRealThreat(cp(0), cp(-50), "b")).toBe(false);
    expect(isRealThreat(cp(0), { type: "mate", winner: "w", moves: 1 }, "w")).toBe(true);
  });

  it("notices when the bot's move handed the player a chance", () => {
    expect(botSlipped(cp(0), cp(350), "w")).toBe(true);
    expect(botSlipped(cp(0), cp(100), "w")).toBe(false);
    expect(botSlipped(cp(0), cp(-350), "b")).toBe(true);
  });
});
