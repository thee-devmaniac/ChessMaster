import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "./fen";
import { importPgn, type MoveInput } from "./rules";
import { ROOT, continuation, isMainLine, pathTo } from "./tree";
import { currentFen, currentStatus, newSession, sessionReducer, statusAt, type Session } from "./game";

const mv = (uci: string): MoveInput => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/** Plays a list of "e2e4"-style moves through the reducer. */
function playAll(s: Session, ucis: string[]): Session {
  return ucis.reduce((acc, u) => sessionReducer(acc, { type: "play", move: mv(u) }), s);
}

const sans = (s: Session, ids: string[]) => ids.map((id) => s.tree.nodes[id].move!.san);
const mainLine = (s: Session) => sans(s, continuation(s.tree, ROOT));

const OPENING = ["e2e4", "e7e5", "g1f3", "b8c6"]; // 1. e4 e5 2. Nf3 Nc6

describe("sessionReducer", () => {
  it("plays moves and stays on the latest one", () => {
    const s = playAll(newSession(), OPENING);
    expect(mainLine(s)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(sans(s, pathTo(s.tree, s.current))).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("ignores an illegal move", () => {
    const s = newSession();
    expect(sessionReducer(s, { type: "play", move: mv("e2e5") })).toBe(s);
  });

  it("steps back and forward along the line, and stops at both ends", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "back" });
    expect(sans(s, pathTo(s.tree, s.current))).toEqual(["e4", "e5", "Nf3"]);
    s = sessionReducer(s, { type: "start" });
    expect(s.current).toBe(ROOT);
    expect(currentFen(s)).toBe(STARTING_FEN);
    expect(sessionReducer(s, { type: "back" }).current).toBe(ROOT);
    s = sessionReducer(s, { type: "end" });
    expect(sans(s, [s.current])).toEqual(["Nc6"]);
    expect(sessionReducer(s, { type: "forward" }).current).toBe(s.current);
  });

  it("a different move from an earlier position becomes a variation; the game is kept", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "goTo", id: pathTo(s.tree, s.current)[1] }); // after 1... e5
    s = playAll(s, ["f2f4", "e5f4"]); // King's Gambit: 2. f4 exf4
    expect(mainLine(s)).toEqual(["e4", "e5", "Nf3", "Nc6"]); // untouched
    expect(sans(s, pathTo(s.tree, s.current))).toEqual(["e4", "e5", "f4", "exf4"]);
    expect(isMainLine(s.tree, s.current)).toBe(false);
  });

  it("replaying an existing move just walks into it", () => {
    let s = playAll(newSession(), OPENING);
    const nodes = Object.keys(s.tree.nodes).length;
    s = sessionReducer(s, { type: "start" });
    s = playAll(s, ["e2e4", "e7e5"]);
    expect(Object.keys(s.tree.nodes)).toHaveLength(nodes);
    expect(sans(s, [s.current])).toEqual(["e5"]);
  });

  it("forward follows the main line; 'end' goes to the end of the line you are on", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "goTo", id: pathTo(s.tree, s.current)[1] });
    s = playAll(s, ["f2f4", "e5f4"]);
    s = sessionReducer(s, { type: "goTo", id: pathTo(s.tree, s.current)[1] }); // back to 1... e5
    expect(sans(s, [sessionReducer(s, { type: "forward" }).current])).toEqual(["Nf3"]);
    const inVariation = sessionReducer(s, { type: "goTo", id: s.tree.nodes[s.current].children[1] });
    expect(sans(inVariation, [sessionReducer(inVariation, { type: "end" }).current])).toEqual(["exf4"]);
  });

  it("delete removes the current move and what follows, and shows the position before it", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "back" }); // on Nf3
    s = sessionReducer(s, { type: "delete" });
    expect(mainLine(s)).toEqual(["e4", "e5"]);
    expect(sans(s, [s.current])).toEqual(["e5"]);
    expect(sessionReducer(newSession(), { type: "delete" }).current).toBe(ROOT);
  });

  it("promote makes the current variation the main line", () => {
    let s = playAll(newSession(), OPENING);
    s = sessionReducer(s, { type: "goTo", id: pathTo(s.tree, s.current)[1] });
    s = playAll(s, ["f2f4"]);
    s = sessionReducer(s, { type: "promote" });
    expect(mainLine(s)).toEqual(["e4", "e5", "f4"]);
  });

  it("loads an imported game as the main line and shows its final position", () => {
    const r = importPgn("1. e4 e5 2. f4 exf4");
    if (!r.ok) throw new Error(r.error);
    const s = sessionReducer(newSession(), { type: "load", game: r.game });
    expect(mainLine(s)).toEqual(["e4", "e5", "f4", "exf4"]);
    expect(sans(s, [s.current])).toEqual(["exf4"]);
  });
});

describe("status", () => {
  it("detects threefold repetition along the path that led to the position", () => {
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8"];
    const s = playAll(newSession(), [...shuffle, ...shuffle]);
    expect(currentStatus(s)).toEqual({ kind: "draw", reason: "threefold repetition" });
  });

  it("reports checkmate at the end of Scholar's mate", () => {
    const s = playAll(newSession(), ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"]);
    expect(currentStatus(s)).toEqual({ kind: "checkmate", winner: "w" });
  });

  it("statusAt still works on a plain line", () => {
    const r = importPgn("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    if (!r.ok) throw new Error(r.error);
    expect(statusAt(r.game, 7)).toEqual({ kind: "checkmate", winner: "w" });
    expect(statusAt(r.game, 6).kind).toBe("playing");
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
  });

  it("uses the FEN header when the game starts from a custom position", () => {
    const r = importPgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 Kd7 *');
    expect(r.ok && r.game.startFen).toBe("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
  });

  it("keeps only the main line of a PGN that contains variations", () => {
    const r = importPgn("1. e4 e5 2. Nf3 (2. f4 exf4) 2... Nc6 *");
    expect(r.ok && r.game.moves.map((m) => m.san)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("reports an error for an illegal move or junk text", () => {
    expect(importPgn("1. e4 e5 2. Ke3")).toEqual({ ok: false, error: "Invalid move in PGN: Ke3" });
    expect(importPgn("hello there").ok).toBe(false);
    expect(importPgn("").ok).toBe(false);
  });
});
