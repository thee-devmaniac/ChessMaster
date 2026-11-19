import { describe, expect, it } from "vitest";
import { makeMove } from "./rules";
import { ROOT, addMove, fenOf, newTree, type GameTree } from "./tree";
import { moveListModel, type InlineToken, type MoveListItem } from "./moveListModel";
import { STARTING_FEN as START } from "./fen";

/** Adds a sequence of UCI moves starting after `from`; returns the tree and the id of each move. */
function line(tree: GameTree, from: string, ucis: string[]) {
  const ids: string[] = [];
  let at = from;
  for (const u of ucis) {
    const played = makeMove(fenOf(tree, at), { from: u.slice(0, 2), to: u.slice(2, 4) })!;
    const added = addMove(tree, at, played);
    tree = added.tree;
    at = added.id;
    ids.push(at);
  }
  return { tree, ids };
}

/** Renders the model as text, so tests read like a chess book. */
function render(items: MoveListItem[]): string[] {
  const inline = (tokens: InlineToken[]) =>
    tokens.map((t) => (t.kind === "move" ? t.text : t.kind === "open" ? "(" : ")")).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
  return items.map((it) =>
    it.kind === "row"
      ? `${it.number}. ${it.white?.san ?? "…"} ${it.black?.san ?? ""}`.trim()
      : it.lines.map((l) => `(${inline(l)})`).join(" "),
  );
}

describe("moveListModel", () => {
  it("shows a plain game in two columns", () => {
    const { tree } = line(newTree(START), ROOT, ["e2e4", "e7e5", "g1f3"]);
    expect(render(moveListModel(tree))).toEqual(["1. e4 e5", "2. Nf3"]);
  });

  it("puts a variation after the move it replaces, then resumes with '…'", () => {
    const game = line(newTree(START), ROOT, ["e2e4", "e7e5", "g1f3", "b8c6"]);
    const { tree } = line(game.tree, game.ids[1], ["f2f4", "e5f4", "g1f3"]); // 2. f4 exf4 3. Nf3 instead of 2. Nf3
    expect(render(moveListModel(tree))).toEqual([
      "1. e4 e5",
      "2. Nf3",
      "(2. f4 exf4 3. Nf3)",
      "2. … Nc6",
    ]);
  });

  it("nests a variation inside a variation and repeats the move number after it", () => {
    const game = line(newTree(START), ROOT, ["e2e4", "e7e5", "g1f3"]);
    const gambit = line(game.tree, game.ids[1], ["f2f4", "e5f4", "g1f3", "g7g5"]); // 2. f4 exf4 3. Nf3 g5
    const { tree } = line(gambit.tree, gambit.ids[1], ["f1c4", "d8h4"]); // inside it: 3. Bc4 Qh4+ instead of 3. Nf3
    expect(render(moveListModel(tree))).toEqual([
      "1. e4 e5",
      "2. Nf3",
      "(2. f4 exf4 3. Nf3 (3. Bc4 Qh4+) 3... g5)",
    ]);
  });

  it("shows alternatives to Black's move, starting with 'N...'", () => {
    const game = line(newTree(START), ROOT, ["e2e4", "e7e5", "f2f4"]);
    const { tree } = line(game.tree, game.ids[0], ["c7c5"]); // 1... c5 (Sicilian) instead of 1... e5
    expect(render(moveListModel(tree))).toEqual(["1. e4 e5", "(1... c5)", "2. f4"]);
  });
});
