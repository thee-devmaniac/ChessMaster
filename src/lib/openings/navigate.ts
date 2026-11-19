import type { MoveInput, PromotionPiece } from "@/lib/chess/rules";
import { OPENING_ROOT, type Opening, type OpeningNode } from "./types";

/** A complete line, from the first move to a leaf, used by Learn mode. */
export interface OpeningLine {
  /** The deepest name along the line, e.g. "Trap: 3. fxe5?". */
  name: string;
  /** Node ids from the first move to the last. */
  ids: string[];
}

/** All lines from the start to each leaf, main lines first. */
export function allLines(opening: Opening): OpeningLine[] {
  const lines: OpeningLine[] = [];
  const walk = (id: string, path: string[], name: string) => {
    const node = opening.nodes[id];
    const here = node.name ?? name;
    if (node.children.length === 0) {
      lines.push({ name: here, ids: path });
      return;
    }
    for (const child of node.children) walk(child, [...path, child], here);
  };
  walk(OPENING_ROOT, [], opening.name);
  return lines;
}

/**
 * Where a sequence of played moves sits in the opening.
 *  - `node`: the deepest book position reached
 *  - `offBookAt`: index of the first move that is not in the book, or null
 */
export function locate(opening: Opening, sans: string[]): { node: OpeningNode; offBookAt: number | null } {
  let node = opening.nodes[OPENING_ROOT];
  for (let i = 0; i < sans.length; i++) {
    const nextId = node.children.find((c) => opening.nodes[c].san === sans[i]);
    if (!nextId) return { node, offBookAt: i };
    node = opening.nodes[nextId];
  }
  return { node, offBookAt: null };
}

/** The first sentence of an explanation, for short previews. */
export function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

/** "2. f4" or "2... d5" */
export function moveLabel(node: OpeningNode): string {
  if (!node.san) return "Start";
  return `${node.moveNumber}${node.turn === "b" ? "." : "..."} ${node.san}`;
}

/** A book move as a move the session reducer can play. */
export function toMoveInput(node: OpeningNode): MoveInput {
  const uci = node.uci!;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as PromotionPiece | undefined) || undefined };
}
