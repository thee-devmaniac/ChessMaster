import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "./fen";
import { checkedKingSquare, gameStatus, legalTargets, makeMove, type MoveInput } from "./rules";

/** Plays moves given as "e2e4" / "a7a8q" strings, failing loudly on an illegal one. */
function playAll(fen: string, uciMoves: string[]): string {
  for (const uci of uciMoves) {
    const input: MoveInput = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    if (uci.length === 5) input.promotion = uci[4] as MoveInput["promotion"];
    const played = makeMove(fen, input);
    if (!played) throw new Error(`Illegal move in test: ${uci}`);
    fen = played.fenAfter;
  }
  return fen;
}

const targetsOf = (fen: string, from: string) => legalTargets(fen, from).map((t) => t.to).sort();

describe("legal moves", () => {
  it("gives the 20 opening moves (16 pawn moves + 4 knight moves)", () => {
    const squares = ["a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2", "b1", "g1"];
    const total = squares.reduce((n, sq) => n + legalTargets(STARTING_FEN, sq).length, 0);
    expect(total).toBe(20);
    expect(targetsOf(STARTING_FEN, "e2")).toEqual(["e3", "e4"]);
    expect(targetsOf(STARTING_FEN, "e1")).toEqual([]); // the king is boxed in
  });

  it("rejects an illegal move instead of producing a broken position", () => {
    expect(makeMove(STARTING_FEN, { from: "e2", to: "e5" })).toBeNull();
    expect(makeMove(STARTING_FEN, { from: "e7", to: "e5" })).toBeNull(); // not Black's turn
  });

  it("does not let a pinned piece move off the pin line", () => {
    // White knight on e2 is pinned to the king on e1 by the black rook on e8.
    const fen = "4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1";
    expect(legalTargets(fen, "e2")).toEqual([]);
  });

  it("returns SAN and UCI notation for a played move", () => {
    const m = makeMove(STARTING_FEN, { from: "g1", to: "f3" });
    expect(m?.san).toBe("Nf3");
    expect(m?.uci).toBe("g1f3");
  });
});

describe("castling", () => {
  const OPEN = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";

  it("is offered by moving the king two squares", () => {
    expect(targetsOf(OPEN, "e1")).toEqual(expect.arrayContaining(["c1", "g1"]));
    expect(makeMove(OPEN, { from: "e1", to: "g1" })?.san).toBe("O-O");
    expect(makeMove(OPEN, { from: "e1", to: "c1" })?.san).toBe("O-O-O");
  });

  it("is lost for both sides after the king moves, even if it comes back", () => {
    const fen = playAll(OPEN, ["e1f1", "e8f8", "f1e1", "f8e8"]);
    expect(targetsOf(fen, "e1")).not.toContain("g1");
    expect(targetsOf(fen, "e1")).not.toContain("c1");
  });

  it("is lost only on that side after a rook moves", () => {
    const fen = playAll(OPEN, ["h1h2", "e8f8", "h2h1", "f8e8"]);
    expect(targetsOf(fen, "e1")).not.toContain("g1"); // kingside lost
    expect(targetsOf(fen, "e1")).toContain("c1"); // queenside still allowed
  });
});

describe("en passant", () => {
  // White pawn on e5; Black pawn on d7 about to move two squares.
  const BEFORE = "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1";

  it("is available right after the two-square pawn move", () => {
    const fen = playAll(BEFORE, ["d7d5"]);
    const ep = legalTargets(fen, "e5").find((t) => t.to === "d6");
    expect(ep).toEqual({ to: "d6", isCapture: true, isPromotion: false }); // shown as a capture ring
    const after = makeMove(fen, { from: "e5", to: "d6" })!;
    expect(after.san).toBe("exd6");
    expect(after.fenAfter.startsWith("4k3/8/3P4/8/8/8/8/4K3")).toBe(true); // black pawn removed
  });

  it("is gone one move later", () => {
    const fen = playAll(BEFORE, ["d7d5", "e1e2", "e8e7"]);
    expect(targetsOf(fen, "e5")).not.toContain("d6");
  });
});

describe("promotion", () => {
  const FEN = "8/P7/8/8/8/8/8/k6K w - - 0 1";

  it("marks the last-rank square as a promotion (one target, not four)", () => {
    expect(legalTargets(FEN, "a7")).toEqual([{ to: "a8", isCapture: false, isPromotion: true }]);
  });

  it("promotes to the chosen piece", () => {
    // The new queen on a8 checks the black king on a1 along the a-file, hence the "+".
    expect(makeMove(FEN, { from: "a7", to: "a8", promotion: "q" })?.san).toBe("a8=Q+");
    const knight = makeMove(FEN, { from: "a7", to: "a8", promotion: "n" })!;
    expect(knight.san).toBe("a8=N");
    expect(knight.fenAfter.startsWith("N7/")).toBe(true);
  });
});

describe("game status", () => {
  it("detects check and finds the checked king", () => {
    const fen = playAll("4k3/8/8/8/8/8/8/4K2R w - - 0 1", ["h1h8"]);
    expect(gameStatus(fen)).toEqual({ kind: "playing", turn: "b", inCheck: true });
    expect(checkedKingSquare(fen)).toBe("e8");
  });

  it("detects Scholar's mate: 1 e4 e5 2 Qh5 Nc6 3 Bc4 Nf6 4 Qxf7#", () => {
    const fen = playAll(STARTING_FEN, ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"]);
    expect(gameStatus(fen)).toEqual({ kind: "checkmate", winner: "w" });
    expect(checkedKingSquare(fen)).toBe("e8");
    expect(legalTargets(fen, "e8")).toEqual([]);
  });

  it("detects stalemate (no legal move, not in check)", () => {
    // Black king on h8 has no safe square, but is not attacked.
    expect(gameStatus("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")).toEqual({ kind: "stalemate" });
  });

  it("detects a draw by insufficient material (king against king)", () => {
    expect(gameStatus("8/8/8/8/8/8/8/k6K w - - 0 1")).toEqual({
      kind: "draw",
      reason: "insufficient material",
    });
  });

  it("detects the fifty-move rule from the FEN's half-move counter", () => {
    expect(gameStatus("4k3/8/8/8/8/8/8/R3K3 w - - 100 80")).toEqual({
      kind: "draw",
      reason: "fifty-move rule",
    });
  });

  it("says whose turn it is in a normal position", () => {
    expect(gameStatus(STARTING_FEN)).toEqual({ kind: "playing", turn: "w", inCheck: false });
  });
});
