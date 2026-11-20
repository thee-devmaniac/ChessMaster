/**
 * Types for opening lessons.
 *
 * Openings are AUTHORED as nested moves (OpeningSpec / MoveSpec): easy to
 * write and read by hand. They are then BUILT into a tree of OpeningNodes, in
 * which chess.js has checked every move and worked out every position (FEN).
 */

export type Verdict =
  | "equal"
  | "unclear"
  | "slightly better for White"
  | "slightly better for Black"
  | "clearly better for White"
  | "clearly better for Black"
  | "winning for White"
  | "winning for Black";

export type Tag =
  | "main line"
  | "gambit"
  | "counter-gambit"
  | "developing move"
  | "central break"
  | "castling"
  | "trap"
  | "mistake"
  | "fork"
  | "checkmate";

/**
 * A move that is just as good as the lesson's move but isn't a line of its own.
 * In Predict it counts as a correct answer; `note` says why it's fine.
 */
export interface AlsoGood {
  san: string;
  note: string;
}

/** One authored move, plus the moves that can follow it. */
export interface MoveSpec {
  /** The move in standard notation, e.g. "Nf3", "exd5", "O-O". */
  san: string;
  /** Why the move is played, in plain language. */
  explanation: string;
  /** Set where a named line starts, e.g. "Falkbeer Counter-Gambit". */
  name?: string;
  /** Assessment of the position after this move. */
  verdict?: Verdict;
  tags?: Tag[];
  /** Equally good moves in the same position (accepted as correct in Predict). */
  alsoGood?: AlsoGood[];
  /** Possible next moves. The first one is the main line. */
  next?: MoveSpec[];
}

export interface OpeningSpec {
  id: string;
  name: string;
  /** The side the learner plays: sets the board's direction and the side quizzed and practised. */
  playAs: "w" | "b";
  /** The moves that define the opening, shown above the title (e.g. "1. e4 c6"). */
  moveOrder: string;
  /** One line for the list of openings. */
  summary: string;
  /** A short introduction shown before the first move. */
  intro: string;
  /** Where the material for this lesson comes from. */
  source: string;
  moves: MoveSpec[];
}

/** A built node: an authored move with its position worked out. */
export interface OpeningNode {
  /** The moves that lead here, e.g. "e4 e5 f4 d5". The root's id is "". */
  id: string;
  parent: string | null;
  /** null for the root (starting position). */
  san: string | null;
  /** Engine notation ("f2f4"); null for the root. */
  uci: string | null;
  /** The position AFTER this move. */
  fen: string;
  /** Whose turn it is in that position. */
  turn: "w" | "b";
  /** Full-move number of this move (the "2" in "2. f4" or "2... d5"). */
  moveNumber: number;
  explanation: string;
  name?: string;
  verdict?: Verdict;
  tags: Tag[];
  alsoGood: AlsoGood[];
  children: string[];
}

export interface Opening {
  id: string;
  name: string;
  playAs: "w" | "b";
  moveOrder: string;
  summary: string;
  intro: string;
  source: string;
  nodes: Record<string, OpeningNode>;
}

export const OPENING_ROOT = "";
