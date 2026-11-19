import type { Opening, OpeningNode } from "./types";
import { locate } from "./navigate";

export interface PickOptions {
  /** Only ever play the main line (the first child). */
  mainOnly: boolean;
  /** A number in [0, 1). Defaults to Math.random(); tests pass a fixed value. */
  random?: number;
}

/**
 * Chooses the app's reply from the book. The main line is played most of the
 * time (it counts double), but side lines and traps come up too, so the
 * player meets them in practice. Returns null when the book has no move here.
 */
export function pickReply(opening: Opening, node: OpeningNode, { mainOnly, random = Math.random() }: PickOptions): OpeningNode | null {
  const children = node.children.map((id) => opening.nodes[id]);
  if (children.length === 0) return null;
  if (mainOnly) return children[0];
  // Weights: main line 2, every other move 1.
  const weights = children.map((_, i) => (i === 0 ? 2 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let target = random * total;
  for (let i = 0; i < children.length; i++) {
    target -= weights[i];
    if (target < 0) return children[i];
  }
  return children[children.length - 1];
}

export type PracticeState =
  | { kind: "your-move"; node: OpeningNode }
  | { kind: "app-move"; node: OpeningNode }
  /** The player's move at index `at` left the book; `node` is the last book position. */
  | { kind: "off-book"; node: OpeningNode; at: number }
  /** The book line has ended (and the player stayed in it all the way). */
  | { kind: "end"; node: OpeningNode };

/** Where a practice game stands, given the moves played so far. */
export function practiceState(opening: Opening, sans: string[], playerSide: "w" | "b"): PracticeState {
  const { node, offBookAt } = locate(opening, sans);
  if (offBookAt !== null) return { kind: "off-book", node, at: offBookAt };
  if (node.children.length === 0) return { kind: "end", node };
  return node.turn === playerSide ? { kind: "your-move", node } : { kind: "app-move", node };
}
