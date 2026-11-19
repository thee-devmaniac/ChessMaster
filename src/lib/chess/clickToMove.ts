import { legalTargets, pieceAt, turn, type MoveInput, type PromotionPiece, type Target } from "./rules";

/**
 * The click-to-move "state machine".
 *
 * A state machine is a small set of states plus rules for moving between them.
 * Here the states are:
 *   idle               – nothing selected
 *   selected           – a piece is selected; its legal targets are shown
 *   choosingPromotion  – a pawn is about to promote; the picker is open
 *
 * clickSquare() and choosePromotion() take the current state and return the
 * next state, plus a move to play if the click completed one. They never
 * change anything themselves, so the whole behaviour is easy to unit-test.
 */
export type ClickState =
  | { kind: "idle" }
  | { kind: "selected"; from: string; targets: Target[] }
  | { kind: "choosingPromotion"; from: string; to: string };

export interface ClickResult {
  state: ClickState;
  move?: MoveInput;
}

export const IDLE: ClickState = { kind: "idle" };

/** Selects `square` if it holds a piece of the side to move. */
function trySelect(fen: string, square: string): ClickState {
  const piece = pieceAt(fen, square);
  // Both sides are entered by clicking (the player is recreating a game),
  // so "your" pieces are simply the pieces of whoever's turn it is.
  if (piece && piece.color === turn(fen)) {
    return { kind: "selected", from: square, targets: legalTargets(fen, square) };
  }
  return IDLE;
}

export function clickSquare(fen: string, state: ClickState, square: string): ClickResult {
  switch (state.kind) {
    case "idle":
      return { state: trySelect(fen, square) };

    case "selected": {
      if (square === state.from) return { state: IDLE }; // click the same piece again: deselect

      const target = state.targets.find((t) => t.to === square);
      if (target?.isPromotion) {
        return { state: { kind: "choosingPromotion", from: state.from, to: square } };
      }
      if (target) {
        return { state: IDLE, move: { from: state.from, to: square } };
      }
      // Not a legal destination: switch to another own piece, or deselect.
      return { state: trySelect(fen, square) };
    }

    case "choosingPromotion":
      // Clicking the board while the picker is open cancels the promotion.
      return { state: IDLE };
  }
}

export function choosePromotion(state: ClickState, piece: PromotionPiece): ClickResult {
  if (state.kind !== "choosingPromotion") return { state };
  return { state: IDLE, move: { from: state.from, to: state.to, promotion: piece } };
}
