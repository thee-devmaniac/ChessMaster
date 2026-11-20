import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { makeMove, pieceAt, turn } from "@/lib/chess/rules";
import { FIRST_STEPS, moveMeetsGoal } from "./firstSteps";

/** Plays a step's solution (standard notation) and returns it as the app's move type. */
function solve(fen: string, san: string) {
  const m = new Chess(fen).move(san);
  return makeMove(fen, { from: m.from, to: m.to, promotion: m.promotion as "q" | undefined })!;
}

describe("First steps lesson", () => {
  it("has unique ids and a legal position for every step", () => {
    expect(new Set(FIRST_STEPS.map((s) => s.id)).size).toBe(FIRST_STEPS.length);
    for (const s of FIRST_STEPS) expect(() => new Chess(s.fen), s.id).not.toThrow();
  });

  it("every task can be done: each solution is legal and meets its goal", () => {
    for (const s of FIRST_STEPS) {
      if (s.goal.kind === "read") continue;
      if (s.goal.kind === "square") {
        expect(s.solution, s.id).toBe(s.goal.square);
        continue;
      }
      const move = solve(s.fen, s.solution!);
      expect(moveMeetsGoal(s.goal, move), s.id).toBe(true);
    }
  });

  it("shows the moves of a piece belonging to the side to move", () => {
    for (const s of FIRST_STEPS.filter((x) => x.showMovesFrom)) {
      expect(pieceAt(s.fen, s.showMovesFrom!)?.color, s.id).toBe(turn(s.fen));
    }
  });

  it("rejects the wrong move for a specific task", () => {
    const rook = FIRST_STEPS.find((s) => s.id === "rook")!;
    expect(moveMeetsGoal(rook.goal, solve(rook.fen, "Rd2"))).toBe(false);
    const mate = FIRST_STEPS.find((s) => s.id === "mate")!;
    expect(moveMeetsGoal(mate.goal, solve(mate.fen, "Ra7"))).toBe(false);
  });

  it("the stalemate example really is stalemate", () => {
    const s = FIRST_STEPS.find((x) => x.id === "stalemate")!;
    expect(new Chess(s.fen).isStalemate()).toBe(true);
  });
});
