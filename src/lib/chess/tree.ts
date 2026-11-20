import type { PlayedMove } from "./rules";
import type { TimeControl } from "./clock";

/**
 * A game as a TREE of moves, so trying a different move keeps the original.
 *
 *            root (starting position)
 *              │
 *             e4
 *              │
 *             e5
 *            ┌─┴──────┐
 *           Nf3       f4        <- two possible 2nd moves for White
 *            │         │
 *           Nc6      exf4
 *
 * Each node holds one move and its possible next moves (children).
 * The FIRST child is the main line; any others are variations (side lines).
 *
 * The tree is never changed in place: every function returns a new tree.
 * That is what React needs to notice changes, and it keeps tests simple.
 */

export const ROOT = "root";

export interface MoveNode {
  id: string;
  /** null only for the root. */
  parent: string | null;
  /** null only for the root (the starting position has no move). */
  move: PlayedMove | null;
  /** Next moves. children[0] is the main continuation. */
  children: string[];
}

export interface GameTree {
  startFen: string;
  nodes: Record<string, MoveNode>;
  /** Counter for new node ids, so ids are predictable (n1, n2, ...). */
  nextId: number;
  /** The clock settings of an imported game, if it had a clock. */
  timeControl?: TimeControl;
}

export function newTree(startFen: string): GameTree {
  return {
    startFen,
    nodes: { [ROOT]: { id: ROOT, parent: null, move: null, children: [] } },
    nextId: 1,
  };
}

/** The position (FEN) at a node: after its move, or the start for the root. */
export function fenOf(tree: GameTree, id: string): string {
  return tree.nodes[id].move?.fenAfter ?? tree.startFen;
}

export function has(tree: GameTree, id: string): boolean {
  return id in tree.nodes;
}

/** Node ids from the first move down to `id` (the root is not included). */
export function pathTo(tree: GameTree, id: string): string[] {
  const path: string[] = [];
  for (let n = tree.nodes[id]; n && n.id !== ROOT; n = tree.nodes[n.parent!]) path.unshift(n.id);
  return path;
}

/** Node ids after `id`, always following the first child. */
export function continuation(tree: GameTree, id: string): string[] {
  const ids: string[] = [];
  for (let next = tree.nodes[id].children[0]; next; next = tree.nodes[next].children[0]) ids.push(next);
  return ids;
}

/** The whole line through `id`: how we got here, then the main continuation. */
export function lineThrough(tree: GameTree, id: string): string[] {
  return [...pathTo(tree, id), ...continuation(tree, id)];
}

/** True if every move on the way to `id` is a first child, i.e. it is on the main line. */
export function isMainLine(tree: GameTree, id: string): boolean {
  return pathTo(tree, id).every((n) => tree.nodes[tree.nodes[n].parent!].children[0] === n);
}

/**
 * Adds a move after `parentId`. If that exact move is already there, nothing
 * new is created: we just return the existing node (so replaying a game by
 * clicking walks through it instead of creating duplicates).
 */
export function addMove(tree: GameTree, parentId: string, move: PlayedMove): { tree: GameTree; id: string } {
  const parent = tree.nodes[parentId];
  const existing = parent.children.find((c) => tree.nodes[c].move?.uci === move.uci);
  if (existing) return { tree, id: existing };

  const id = `n${tree.nextId}`;
  return {
    id,
    tree: {
      ...tree,
      nextId: tree.nextId + 1,
      nodes: {
        ...tree.nodes,
        [parentId]: { ...parent, children: [...parent.children, id] },
        [id]: { id, parent: parentId, move, children: [] },
      },
    },
  };
}

/** Removes a node and everything after it. The root cannot be removed. */
export function deleteFrom(tree: GameTree, id: string): GameTree {
  if (id === ROOT || !has(tree, id)) return tree;
  const nodes = { ...tree.nodes };
  const remove = (n: string) => {
    for (const c of nodes[n].children) remove(c);
    delete nodes[n];
  };
  const parentId = tree.nodes[id].parent!;
  remove(id);
  nodes[parentId] = { ...nodes[parentId], children: nodes[parentId].children.filter((c) => c !== id) };
  return { ...tree, nodes };
}

/** Makes the line through `id` the main line, by moving each step to the front of its siblings. */
export function promoteToMainLine(tree: GameTree, id: string): GameTree {
  const nodes = { ...tree.nodes };
  for (const n of pathTo(tree, id)) {
    const parentId = nodes[n].parent!;
    const siblings = nodes[parentId].children;
    if (siblings[0] !== n) {
      nodes[parentId] = { ...nodes[parentId], children: [n, ...siblings.filter((c) => c !== n)] };
    }
  }
  return { ...tree, nodes };
}

/** Builds a tree with a single line (used when importing a PGN). */
export function treeFromMoves(startFen: string, moves: PlayedMove[], timeControl?: TimeControl): GameTree {
  let tree: GameTree = { ...newTree(startFen), timeControl };
  let at = ROOT;
  for (const m of moves) {
    const added = addMove(tree, at, m);
    tree = added.tree;
    at = added.id;
  }
  return tree;
}

/** Full-move number and colour of the move at node `id` ("3." for White, "3..." for Black). */
export function moveNumberOf(tree: GameTree, id: string): { number: number; color: "w" | "b" } {
  const before = fenOf(tree, tree.nodes[id].parent!).split(" ");
  return { number: Number(before[5]) || 1, color: before[1] === "b" ? "b" : "w" };
}
