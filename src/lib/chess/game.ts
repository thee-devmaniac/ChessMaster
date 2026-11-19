import {
  gameStatus,
  isThreefoldRepetition,
  makeMove,
  type GameStatus,
  type MoveInput,
  type PlayedMove,
} from "./rules";
import { STARTING_FEN } from "./fen";

/**
 * A game is a starting position plus the list of moves played from it.
 * That is all we store. Every position in the game can be worked out from it.
 */
export interface GameRecord {
  startFen: string;
  moves: PlayedMove[];
}

/**
 * The session = the game + which position is on screen.
 *
 * `view` is a ply index: 0 = the starting position, 1 = after the first move,
 * ..., moves.length = the latest position. Keeping it separate from the move
 * list is what makes stepping back and forward simple: we never delete moves
 * just to look at an earlier position.
 */
export interface Session {
  game: GameRecord;
  view: number;
}

export function newSession(startFen: string = STARTING_FEN): Session {
  return { game: { startFen, moves: [] }, view: 0 };
}

/** The position (FEN) after `ply` moves. Each played move already stores its FEN. */
export function fenAt(game: GameRecord, ply: number): string {
  return ply === 0 ? game.startFen : game.moves[ply - 1].fenAfter;
}

export function currentFen(s: Session): string {
  return fenAt(s.game, s.view);
}

export function isAtEnd(s: Session): boolean {
  return s.view === s.game.moves.length;
}

/** Game status for the position on screen, including threefold repetition. */
export function statusAt(game: GameRecord, ply: number): GameStatus {
  const status = gameStatus(fenAt(game, ply));
  if (status.kind === "playing" && isThreefoldRepetition(game.startFen, game.moves.slice(0, ply))) {
    return { kind: "draw", reason: "threefold repetition" };
  }
  return status;
}

export type SessionAction =
  | { type: "play"; move: MoveInput }
  | { type: "undo" }
  | { type: "goTo"; ply: number }
  | { type: "back" }
  | { type: "forward" }
  | { type: "start"; startFen: string }
  | { type: "load"; game: GameRecord };

/**
 * The reducer: (current session, action) -> next session.
 * React's useReducer calls it; tests call it directly.
 */
export function sessionReducer(s: Session, action: SessionAction): Session {
  const last = s.game.moves.length;
  switch (action.type) {
    case "play": {
      const played = makeMove(currentFen(s), action.move);
      if (!played) return s; // illegal: nothing changes

      // If this is the move that was already played next, just step forward.
      // That way replaying a game by clicking does not destroy what comes after.
      const next = s.game.moves[s.view];
      if (next && next.uci === played.uci) return { ...s, view: s.view + 1 };

      // Otherwise the new move replaces everything after the current position.
      // (Keeping both lines as branches is a later feature.)
      const moves = [...s.game.moves.slice(0, s.view), played];
      return { game: { ...s.game, moves }, view: moves.length };
    }
    case "undo": {
      // Take back the last move of the game and show the new last position.
      if (last === 0) return s;
      const moves = s.game.moves.slice(0, -1);
      return { game: { ...s.game, moves }, view: moves.length };
    }
    case "goTo":
      return { ...s, view: Math.max(0, Math.min(last, action.ply)) };
    case "back":
      return { ...s, view: Math.max(0, s.view - 1) };
    case "forward":
      return { ...s, view: Math.min(last, s.view + 1) };
    case "start":
      return newSession(action.startFen);
    case "load":
      return { game: action.game, view: action.game.moves.length };
  }
}

/** Groups plies into numbered rows for display: "1. e4 e5", "2. Nf3 ...". */
export interface MoveRow {
  number: number;
  white?: { san: string; ply: number };
  black?: { san: string; ply: number };
}

export function moveRows(game: GameRecord): MoveRow[] {
  // The FEN's last field is the full-move number; its second field says who starts.
  const parts = game.startFen.split(" ");
  let number = Number(parts[5]) || 1;
  let blackToStart = parts[1] === "b";

  const rows: MoveRow[] = [];
  let row: MoveRow | null = null;
  for (let i = 0; i < game.moves.length; i++) {
    const san = game.moves[i].san;
    const ply = i + 1; // the position after this move
    if (blackToStart) {
      rows.push({ number, black: { san, ply } }); // shown as "5. … Nf6"
      number++;
      blackToStart = false;
    } else if (!row) {
      row = { number, white: { san, ply } };
      rows.push(row);
    } else {
      row.black = { san, ply };
      row = null;
      number++;
    }
  }
  return rows;
}
