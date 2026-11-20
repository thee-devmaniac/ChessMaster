import { pieceAt, type PieceType } from "@/lib/chess/rules";
import type { Opening, OpeningNode } from "./types";

/** Who is being quizzed: one side, or every move. */
export type QuizSide = "w" | "b" | "both";

/** The side that plays the move at `node` (the side to move in the position before it). */
export function moverOf(opening: Opening, node: OpeningNode): "w" | "b" {
  return opening.nodes[node.parent!].turn;
}

/**
 * Should the player be asked to find this move? Not if it belongs to the
 * other side, and never if the book marks it as a mistake: in a trap line
 * you are quizzed on punishing the mistake, not on making it.
 */
export function isQuizMove(opening: Opening, node: OpeningNode, side: QuizSide): boolean {
  if (node.tags.includes("mistake")) return false;
  return side === "both" || moverOf(opening, node) === side;
}

export type GuessResult =
  | { kind: "correct" }
  /** Not the lesson's move, but just as good (the lesson then carries on with its own move). */
  | { kind: "also-good"; note: string }
  /** Another move from the book that is fine, but this line goes a different way. */
  | { kind: "other-book"; node: OpeningNode }
  /** A move the book knows and marks as a mistake (its explanation says why). */
  | { kind: "book-mistake"; node: OpeningNode }
  /** A move that isn't in the book. */
  | { kind: "wrong" };

/**
 * Compares a guess (in SAN, as chess.js writes it) with the expected move.
 * The book's other moves in that position get their own answers, so a
 * sensible alternative isn't just called "wrong".
 */
export function checkGuess(opening: Opening, expected: OpeningNode, guessSan: string): GuessResult {
  if (guessSan === expected.san) return { kind: "correct" };
  const alt = expected.alsoGood.find((a) => a.san === guessSan);
  if (alt) return { kind: "also-good", note: alt.note };
  const parent = opening.nodes[expected.parent!];
  const sibling = parent.children.map((id) => opening.nodes[id]).find((n) => n.san === guessSan);
  if (!sibling) return { kind: "wrong" };
  if (sibling.tags.includes("mistake")) return { kind: "book-mistake", node: sibling };
  return { kind: "other-book", node: sibling };
}

const PIECE_NAME: Record<PieceType, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

/**
 * Hints for the expected move, from gentle to giving it away:
 *   1. which piece to move
 *   2. which square it starts from
 *   3. the answer
 */
export function hintsFor(opening: Opening, expected: OpeningNode): string[] {
  const before = opening.nodes[expected.parent!].fen;
  const from = expected.uci!.slice(0, 2);
  const piece = pieceAt(before, from)!;
  if (expected.san!.startsWith("O-O")) {
    return [
      "Think about your king's safety.",
      "Your king and a rook can move together in one move.",
      `The answer is ${expected.san} (castling).`,
    ];
  }
  const capture = expected.san!.includes("x");
  const check = /[+#]$/.test(expected.san!);
  // "your queen" / "your king" (there is normally one), "your knights" etc. otherwise.
  const pieces = piece.type === "q" || piece.type === "k" ? PIECE_NAME[piece.type] : `${PIECE_NAME[piece.type]}s`;
  return [
    `Look at your ${pieces}.${capture ? " Something can be captured." : ""}${check ? " The move gives check." : ""}`,
    `The ${PIECE_NAME[piece.type]} on ${from} moves.`,
    `The answer is ${expected.san}.`,
  ];
}
