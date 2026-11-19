import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "./fen";
import { importPgn, type MoveInput } from "./rules";
import { currentFen, moveRows, newSession, sessionReducer, statusAt, type Session } from "./game";

const mv = (uci: string): MoveInput => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/** Plays a list of "e2e4"-style moves through the reducer. */
function playAll(s: Session, ucis: string[]): Session {
  return ucis.reduce((acc, u) => sessionReducer(acc, { type: "play", move: mv(u) }), s);
}

const OPENING = ["e2e4", "e7e5", "g1f3", "b8c6"]; // 1. e4 e5 2. Nf3 Nc6

describe("sessionReducer", () => {
  it("plays moves and keeps the view at the latest position", () => {
    const s = playAll(newSession(), OPENING);
    expect(s.game.moves.map((m) => m.san)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(s.view).toBe(4);
  });

  it("ignores an illegal move", () => {
    const s = newSession();
    expect(sessionReducer(s, { type: "play", move: mv("e2e5") })).toBe(s);
  });

  it("steps back and forward without changing the moves, and stops at both ends", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "back" });
    expect(s.view).toBe(3);
    expect(s.game.moves).toHaveLength(4); // nothing deleted
    expect(currentFen(s)).toBe(s.game.moves[2].fenAfter);

    s = sessionReducer(s, { type: "goTo", ply: 0 });
    expect(currentFen(s)).toBe(STARTING_FEN);
    expect(sessionReducer(s, { type: "back" }).view).toBe(0); // can't go before the start

    s = sessionReducer(s, { type: "goTo", ply: 999 });
    expect(s.view).toBe(4); // clamped to the end
    expect(sessionReducer(s, { type: "forward" }).view).toBe(4);
  });

  it("replaying the move that comes next just steps forward (later moves are kept)", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "goTo", ply: 2 });
    s = sessionReducer(s, { type: "play", move: mv("g1f3") }); // same as the game's 3rd move
    expect(s.view).toBe(3);
    expect(s.game.moves).toHaveLength(4);
  });

  it("a different move from an earlier position replaces the later moves", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "goTo", ply: 2 });
    s = sessionReducer(s, { type: "play", move: mv("f2f4") }); // King's Gambit instead of Nf3
    expect(s.game.moves.map((m) => m.san)).toEqual(["e4", "e5", "f4"]);
    expect(s.view).toBe(3);
  });

  it("undo removes the last move of the game, from any view", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "goTo", ply: 1 });
    s = sessionReducer(s, { type: "undo" });
    expect(s.game.moves.map((m) => m.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(s.view).toBe(3);
    expect(sessionReducer(newSession(), { type: "undo" }).game.moves).toHaveLength(0);
  });

  it("starts a new game from a FEN", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    const s = sessionReducer(playAll(newSession(), OPENING), { type: "start", startFen: fen });
    expect(s).toEqual({ game: { startFen: fen, moves: [] }, view: 0 });
  });
});

describe("statusAt", () => {
  it("detects threefold repetition (knights going back and forth)", () => {
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8"];
    const s = playAll(newSession(), [...shuffle, ...shuffle]);
    expect(statusAt(s.game, 8)).toEqual({ kind: "draw", reason: "threefold repetition" });
    expect(statusAt(s.game, 4).kind).toBe("playing"); // only twice so far at that point
  });

  it("reports checkmate at the end of Scholar's mate, but not at earlier plies", () => {
    const s = playAll(newSession(), ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"]);
    expect(statusAt(s.game, 7)).toEqual({ kind: "checkmate", winner: "w" });
    expect(statusAt(s.game, 6).kind).toBe("playing");
  });
});

describe("moveRows", () => {
  it("numbers moves in pairs", () => {
    const s = playAll(newSession(), [...OPENING, "f1c4"]);
    expect(moveRows(s.game)).toEqual([
      { number: 1, white: { san: "e4", ply: 1 }, black: { san: "e5", ply: 2 } },
      { number: 2, white: { san: "Nf3", ply: 3 }, black: { san: "Nc6", ply: 4 } },
      { number: 3, white: { san: "Bc4", ply: 5 } },
    ]);
  });

  it("handles a game that starts with Black to move", () => {
    const s = playAll(newSession("4k3/8/8/8/8/8/4P3/4K3 b - - 0 12"), ["e8d7", "e2e4"]);
    expect(moveRows(s.game)).toEqual([
      { number: 12, black: { san: "Kd7", ply: 1 } },
      { number: 13, white: { san: "e4", ply: 2 } },
    ]);
  });
});

describe("importPgn", () => {
  it("reads a Chess.com-style PGN with headers, clock comments and annotations", () => {
    const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[White "player1"]
[Black "player2"]
[Result "1-0"]

1. e4 {[%clk 0:09:58.1]} 1... e5 {[%clk 0:09:57]} 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7# 1-0`;
    const r = importPgn(pgn);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.game.startFen).toBe(STARTING_FEN);
    expect(r.game.moves.map((m) => m.san)).toEqual(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]);
    expect(r.game.headers.White).toBe("player1");
    expect(statusAt(r.game, 7)).toEqual({ kind: "checkmate", winner: "w" });
  });

  it("reads a bare move list without headers", () => {
    const r = importPgn("1. e4 e5 2. f4");
    expect(r.ok && r.game.moves.map((m) => m.san)).toEqual(["e4", "e5", "f4"]);
  });

  it("uses the FEN header when the game starts from a custom position", () => {
    const r = importPgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 Kd7 *');
    expect(r.ok && r.game.startFen).toBe("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
  });

  it("reports an error for an illegal move or junk text", () => {
    expect(importPgn("1. e4 e5 2. Ke3")).toEqual({ ok: false, error: "Invalid move in PGN: Ke3" });
    expect(importPgn("hello there").ok).toBe(false);
    expect(importPgn("").ok).toBe(false);
  });
});
