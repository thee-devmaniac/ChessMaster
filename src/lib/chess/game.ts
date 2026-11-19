import { gameStatus, isThreefoldRepetition, makeMove, type GameStatus, type MoveInput, type PlayedMove } from "./rules";
import { STARTING_FEN } from "./fen";
import {
  ROOT,
  addMove,
  continuation,
  deleteFrom,
  fenOf,
  has,
  newTree,
  pathTo,
  promoteToMainLine,
  treeFromMoves,
  type GameTree,
} from "./tree";

/**
 * A single line of moves from a starting position. The game itself is a tree
 * (tree.ts), but the review and the repetition check work on one line.
 */
export interface GameRecord {
  startFen: string;
  moves: PlayedMove[];
}

/** The position (FEN) after `ply` moves of a line. */
export function fenAt(game: GameRecord, ply: number): string {
  return ply === 0 ? game.startFen : game.moves[ply - 1].fenAfter;
}

/** Game status after `ply` moves of a line, including threefold repetition. */
export function statusAt(game: GameRecord, ply: number): GameStatus {
  const status = gameStatus(fenAt(game, ply));
  if (status.kind === "playing" && isThreefoldRepetition(game.startFen, game.moves.slice(0, ply))) {
    return { kind: "draw", reason: "threefold repetition" };
  }
  return status;
}

/** Turns a list of node ids into a line. */
export function recordOf(tree: GameTree, ids: string[]): GameRecord {
  return { startFen: tree.startFen, moves: ids.map((id) => tree.nodes[id].move!) };
}

/**
 * The session = the move tree + which node is on screen.
 * Moving around only changes `current`. Moves are never deleted just by looking.
 */
export interface Session {
  tree: GameTree;
  current: string;
}

export function newSession(startFen: string = STARTING_FEN): Session {
  return { tree: newTree(startFen), current: ROOT };
}

export function currentFen(s: Session): string {
  return fenOf(s.tree, s.current);
}

/** Status of the position on screen (the repetition check uses the path that led here). */
export function currentStatus(s: Session): GameStatus {
  const path = pathTo(s.tree, s.current);
  return statusAt(recordOf(s.tree, path), path.length);
}

export type SessionAction =
  | { type: "play"; move: MoveInput }
  | { type: "goTo"; id: string }
  | { type: "back" }
  | { type: "forward" }
  | { type: "start" } // jump to the starting position
  | { type: "end" } // jump to the end of the current line
  | { type: "delete" } // delete the current move and everything after it
  | { type: "promote" } // make the current line the main line
  | { type: "new"; startFen: string }
  | { type: "load"; game: GameRecord };

export function sessionReducer(s: Session, action: SessionAction): Session {
  const { tree, current } = s;
  switch (action.type) {
    case "play": {
      const played = makeMove(fenOf(tree, current), action.move);
      if (!played) return s; // illegal: nothing changes
      // A new move after a position that already has a continuation becomes a variation.
      const added = addMove(tree, current, played);
      return { tree: added.tree, current: added.id };
    }
    case "goTo":
      return has(tree, action.id) ? { ...s, current: action.id } : s;
    case "back":
      return { ...s, current: tree.nodes[current].parent ?? ROOT };
    case "forward":
      return { ...s, current: tree.nodes[current].children[0] ?? current };
    case "start":
      return { ...s, current: ROOT };
    case "end":
      return { ...s, current: continuation(tree, current).at(-1) ?? current };
    case "delete":
      if (current === ROOT) return s;
      return { tree: deleteFrom(tree, current), current: tree.nodes[current].parent! };
    case "promote":
      return { ...s, tree: promoteToMainLine(tree, current) };
    case "new":
      return newSession(action.startFen);
    case "load": {
      const loaded = treeFromMoves(action.game.startFen, action.game.moves);
      return { tree: loaded, current: continuation(loaded, ROOT).at(-1) ?? ROOT };
    }
  }
}
