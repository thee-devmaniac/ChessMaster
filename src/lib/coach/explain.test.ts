import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { makeMove } from "@/lib/chess/rules";
import { describeExplanation, describeThreat, explainMove, nullMoveFen } from "./explain";

/** The position after some moves, and the next move played from it. */
function at(sans: string, next: string) {
  const c = new Chess();
  for (const s of sans.split(" ").filter(Boolean)) c.move(s);
  const fen = c.fen();
  const m = c.move(next);
  return { fen, move: makeMove(fen, { from: m.from, to: m.to, promotion: m.promotion as "q" | undefined })! };
}

describe("explainMove", () => {
  it("names a capture and notices you can take back", () => {
    const { fen, move } = at("e4 e5 Nf3 Nc6 Bb5 a6", "Bxc6");
    const e = explainMove(fen, move);
    expect(e.action).toBe("takes your knight on c6 with its bishop");
    expect(e.canRecapture).toBe(true);
  });

  it("describes developing a piece and taking the centre", () => {
    const knight = at("", "Nf3");
    expect(explainMove(knight.fen, knight.move).action).toBe("brings its knight into the game (g1 to f3)");
    const pawn = at("", "e4");
    expect(explainMove(pawn.fen, pawn.move).action).toBe("pushes a pawn to e4, taking space in the centre");
  });

  it("spots an attack on an unprotected piece", () => {
    // 1. e4 Nc6 2. Bc4 Na5: the knight attacks the bishop, and nothing protects it.
    const { fen, move } = at("e4 Nc6 Bc4", "Na5");
    const e = explainMove(fen, move);
    expect(e.attacks).toEqual([{ square: "c4", piece: "b", unprotected: true, worthMore: false }]);
    expect(describeExplanation(e, move.san)).toContain("Now Na5 attacks your bishop on c4. It isn't protected!");
  });

  it("calls out an attack on a more valuable piece even when it's protected", () => {
    // 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd6 4. Nb5: the knight attacks the queen (protected by two pawns).
    const { fen, move } = at("e4 d5 exd5 Qxd5 Nc3 Qd6", "Nb5");
    const e = explainMove(fen, move);
    expect(e.attacks[0]).toEqual({ square: "d6", piece: "q", unprotected: false, worthMore: true });
    expect(describeExplanation(e, move.san)).toContain(
      "Now Nb5 attacks your queen on d6. It's worth more than the piece attacking it.",
    );
  });

  it("recognises check, checkmate and castling", () => {
    const mate = at("f3 e5 g4", "Qh4#");
    const e = explainMove(mate.fen, mate.move);
    expect(e.checkmate).toBe(true);
    expect(describeExplanation(e, "Qh4#")).toEqual(["It moves its queen from d8 to h4.", "That's checkmate."]);
    const castle = at("e4 e5 Nf3 Nc6 Bc4 Bc5", "O-O");
    expect(explainMove(castle.fen, castle.move).action).toContain("castles");
  });
});

describe("threats (null move)", () => {
  it("passes the turn to the side that just moved", () => {
    const c = new Chess();
    c.move("e4");
    expect(nullMoveFen(c.fen())).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1");
  });

  it("refuses when the side to move is in check", () => {
    const { move } = at("e4 f6 d4 g5", "Qh5#");
    expect(nullMoveFen(move.fenAfter)).toBeNull();
  });

  it("describes a mate threat and a threat to win a piece", () => {
    // Scholar's mate set-up: White threatens Qxf7#.
    const c = new Chess();
    for (const s of ["e4", "e5", "Bc4", "Nc6", "Qh5"]) c.move(s);
    const fen = nullMoveFen(c.fen())!;
    expect(describeThreat(fen, "h5f7")).toBe("checkmate with Qxf7#");
    // From the start, Black's knight could take nothing; a capture is described with the piece.
    const d = new Chess();
    for (const s of ["e4", "Nc6", "Bc4", "Na5"]) d.move(s);
    expect(describeThreat(nullMoveFen(d.fen())!, "a5c4")).toBe("to take your bishop on c4 (Nxc4)");
  });
});
