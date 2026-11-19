import { ROOT, moveNumberOf, type GameTree, type MoveNode } from "./tree";

/**
 * Turns the move tree into what the move list displays, in the usual chess
 * book style:
 *
 *   1. e4      e5
 *   2. Nf3
 *      (2. f4 exf4 3. Nf3 (3. Bc4 Qh4+) 3... g5)
 *   2. …       Nc6
 *
 * The main line is shown in two columns. Variations (alternatives to a
 * main-line move) appear in brackets right after that move; variations of
 * variations are nested in more brackets.
 *
 * This is a pure function, so the layout rules are tested without React.
 */

export interface Cell {
  id: string;
  san: string;
}

export type InlineToken =
  | { kind: "move"; id: string; text: string } // text includes the move number when needed
  | { kind: "open" }
  | { kind: "close" };

export type MoveListItem =
  | { kind: "row"; number: number; white?: Cell; black?: Cell }
  | { kind: "variations"; lines: InlineToken[][] };

function inlineMove(tree: GameTree, id: string, showNumber: boolean): InlineToken {
  const { number, color } = moveNumberOf(tree, id);
  const san = tree.nodes[id].move!.san;
  const prefix = color === "w" ? `${number}. ` : showNumber ? `${number}... ` : "";
  return { kind: "move", id, text: prefix + san };
}

/** A variation starting at `startId`, written inline, with nested variations in brackets. */
export function inlineLine(tree: GameTree, startId: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let showNumber = true; // a line always starts with a number, even for Black ("3... g5")
  for (let id: string | undefined = startId; id; id = tree.nodes[id].children[0]) {
    tokens.push(inlineMove(tree, id, showNumber));
    showNumber = false;
    if (id !== startId) {
      // Alternatives to this move. (Alternatives to the first move are shown by whoever called us.)
      const parent: MoveNode = tree.nodes[tree.nodes[id].parent!];
      for (const alt of parent.children.slice(1) as string[]) {
        if (alt === id) continue;
        tokens.push({ kind: "open" }, ...inlineLine(tree, alt), { kind: "close" });
        showNumber = true; // after a bracket, say again whose move it is
      }
    }
  }
  return tokens;
}

export function moveListModel(tree: GameTree): MoveListItem[] {
  const items: MoveListItem[] = [];
  let row: Extract<MoveListItem, { kind: "row" }> | null = null;

  for (let id: string | undefined = tree.nodes[ROOT].children[0]; id; id = tree.nodes[id].children[0]) {
    const { number, color } = moveNumberOf(tree, id);
    const cell = { id, san: tree.nodes[id].move!.san };

    if (color === "w") {
      row = { kind: "row", number, white: cell };
      items.push(row);
    } else if (row && row.number === number && !row.black) {
      row.black = cell;
    } else {
      row = { kind: "row", number, black: cell }; // shown as "N. …  move"
      items.push(row);
    }

    // Alternatives to this main-line move, shown right after it.
    const siblings = tree.nodes[tree.nodes[id].parent!].children.slice(1);
    if (siblings.length > 0) {
      items.push({ kind: "variations", lines: siblings.map((s) => inlineLine(tree, s)) });
      row = null; // the next move starts a fresh row
    }
  }
  return items;
}
