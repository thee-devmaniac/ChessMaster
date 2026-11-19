import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "./fen";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "./clickToMove";

const selectedFrom = (s: ClickState) => (s.kind === "selected" ? s.from : null);

describe("click-to-move", () => {
  it("selects a piece of the side to move and lists its targets", () => {
    const { state, move } = clickSquare(STARTING_FEN, IDLE, "e2");
    expect(move).toBeUndefined();
    expect(state.kind).toBe("selected");
    if (state.kind === "selected") {
      expect(state.targets.map((t) => t.to).sort()).toEqual(["e3", "e4"]);
    }
  });

  it("ignores clicks on the opponent's pieces and on empty squares when nothing is selected", () => {
    expect(clickSquare(STARTING_FEN, IDLE, "e7").state).toEqual(IDLE);
    expect(clickSquare(STARTING_FEN, IDLE, "e4").state).toEqual(IDLE);
  });

  it("moves when a legal destination is clicked", () => {
    const sel = clickSquare(STARTING_FEN, IDLE, "g1").state;
    expect(clickSquare(STARTING_FEN, sel, "f3")).toEqual({
      state: IDLE,
      move: { from: "g1", to: "f3" },
    });
  });

  it("switches the selection when another own piece is clicked", () => {
    const sel = clickSquare(STARTING_FEN, IDLE, "e2").state;
    const next = clickSquare(STARTING_FEN, sel, "d2");
    expect(next.move).toBeUndefined();
    expect(selectedFrom(next.state)).toBe("d2");
  });

  it("deselects when the selected piece is clicked again", () => {
    const sel = clickSquare(STARTING_FEN, IDLE, "e2").state;
    expect(clickSquare(STARTING_FEN, sel, "e2")).toEqual({ state: IDLE });
  });

  it("deselects on an illegal destination and never produces a move", () => {
    const sel = clickSquare(STARTING_FEN, IDLE, "e2").state;
    expect(clickSquare(STARTING_FEN, sel, "e5")).toEqual({ state: IDLE }); // empty, not legal
    expect(clickSquare(STARTING_FEN, sel, "e7")).toEqual({ state: IDLE }); // enemy piece, not reachable
  });

  it("selects a piece with no legal moves, but shows no targets", () => {
    const sel = clickSquare(STARTING_FEN, IDLE, "a1").state; // rook boxed in
    expect(sel).toEqual({ kind: "selected", from: "a1", targets: [] });
  });

  describe("promotion", () => {
    const FEN = "8/P7/8/8/8/8/8/k6K w - - 0 1";

    it("opens the picker instead of moving, then plays the chosen piece", () => {
      const sel = clickSquare(FEN, IDLE, "a7").state;
      const picking = clickSquare(FEN, sel, "a8");
      expect(picking).toEqual({ state: { kind: "choosingPromotion", from: "a7", to: "a8" } });

      expect(choosePromotion(picking.state, "n")).toEqual({
        state: IDLE,
        move: { from: "a7", to: "a8", promotion: "n" },
      });
    });

    it("cancels if the board is clicked while the picker is open", () => {
      const picking = { kind: "choosingPromotion", from: "a7", to: "a8" } as const;
      expect(clickSquare(FEN, picking, "h1")).toEqual({ state: IDLE });
    });

    it("ignores a promotion choice when no promotion is pending", () => {
      expect(choosePromotion(IDLE, "q")).toEqual({ state: IDLE });
    });
  });
});
