import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "./fen";
import { makeMove } from "./rules";
import {
  ROOT,
  addMove,
  continuation,
  deleteFrom,
  fenOf,
  isMainLine,
  lineThrough,
  moveNumberOf,
  newTree,
  pathTo,
  promoteToMainLine,
  type GameTree,
} from "./tree";

/** Adds a move (UCI) after `parent`, returning the new tree and node id. */
function add(tree: GameTree, parent: string, uci: string) {
  const played = makeMove(fenOf(tree, parent), { from: uci.slice(0, 2), to: uci.slice(2, 4) });
  if (!played) throw new Error(`illegal in test: ${uci}`);
  return addMove(tree, parent, played);
}

/** Builds:  1. e4 e5 2. Nf3 Nc6, with the variation 2. f4 exf4 */
function sample() {
  const e4 = add(newTree(STARTING_FEN), ROOT, "e2e4");
  const e5 = add(e4.tree, e4.id, "e7e5");
  const nf3 = add(e5.tree, e5.id, "g1f3");
  const nc6 = add(nf3.tree, nf3.id, "b8c6");
  const f4 = add(nc6.tree, e5.id, "f2f4"); // a second move after 1... e5: a variation
  const exf4 = add(f4.tree, f4.id, "e5f4");
  return { t: exf4.tree, e4: e4.id, e5: e5.id, nf3: nf3.id, nc6: nc6.id, f4: f4.id, exf4: exf4.id };
}

describe("move tree", () => {
  it("keeps the first move played as the main line and later ones as variations", () => {
    const { t, e5, nf3, f4 } = sample();
    expect(t.nodes[e5].children).toEqual([nf3, f4]);
    expect(isMainLine(t, nf3)).toBe(true);
    expect(isMainLine(t, f4)).toBe(false);
  });

  it("does not duplicate a move that already exists", () => {
    const { t, e5, nf3 } = sample();
    const again = add(t, e5, "g1f3");
    expect(again.id).toBe(nf3);
    expect(again.tree).toBe(t); // unchanged
  });

  it("gives paths and lines through a node", () => {
    const { t, e4, e5, nf3, nc6, f4, exf4 } = sample();
    expect(pathTo(t, exf4)).toEqual([e4, e5, f4, exf4]);
    expect(continuation(t, e4)).toEqual([e5, nf3, nc6]);
    expect(lineThrough(t, f4)).toEqual([e4, e5, f4, exf4]);
    expect(lineThrough(t, ROOT)).toEqual([e4, e5, nf3, nc6]);
  });

  it("deletes a node and everything after it", () => {
    const { t, e5, nf3, nc6, f4 } = sample();
    const after = deleteFrom(t, nf3);
    expect(after.nodes[e5].children).toEqual([f4]); // f4 is now the main line
    expect(nf3 in after.nodes || nc6 in after.nodes).toBe(false);
    expect(deleteFrom(t, ROOT)).toBe(t); // the root can't be deleted
  });

  it("promotes a variation to the main line", () => {
    const { t, e5, nf3, f4, exf4 } = sample();
    const after = promoteToMainLine(t, exf4);
    expect(after.nodes[e5].children).toEqual([f4, nf3]);
    expect(isMainLine(after, exf4)).toBe(true);
    expect(t.nodes[e5].children).toEqual([nf3, f4]); // the original tree is untouched
  });

  it("knows the move number and colour of each move", () => {
    const { t, e4, e5, exf4 } = sample();
    expect(moveNumberOf(t, e4)).toEqual({ number: 1, color: "w" });
    expect(moveNumberOf(t, e5)).toEqual({ number: 1, color: "b" });
    expect(moveNumberOf(t, exf4)).toEqual({ number: 2, color: "b" });
  });
});
