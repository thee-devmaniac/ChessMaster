import { Chess, type Square } from "chess.js";
import type { PieceType, PlayedMove } from "@/lib/chess/rules";
import type { Color } from "@/lib/engine/types";

/**
 * Plain-language explanations of a move, for coach mode: what the move did,
 * and what it now attacks. Everything here is worked out from the rules
 * (chess.js), not guessed: the engine only comes in for threats (see
 * nullMoveFen) and for judging moves.
 */

const PIECE: Record<PieceType, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
/** The usual rough values, used to say "worth more than the piece attacking it". */
const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const CENTRE = new Set(["d4", "e4", "d5", "e5"]);

export const pieceName = (t: PieceType) => PIECE[t];

/** A piece of the other side that the moved piece now attacks. */
export interface NewAttack {
  square: string;
  piece: PieceType;
  /** No piece of its own side protects it. */
  unprotected: boolean;
  /** Worth more than the attacking piece, so even a protected one is in trouble. */
  worthMore: boolean;
}

export interface MoveExplanation {
  /** What the move did, e.g. "takes your knight on f6". */
  action: string;
  check: boolean;
  checkmate: boolean;
  /** Pieces the moved piece attacks now that it didn't before (most valuable first, at most two). */
  attacks: NewAttack[];
  /** After a capture: can the other side take back on that square? */
  canRecapture: boolean;
}

/** Squares of `side`'s pieces that the piece on `from` attacks in `fen`. */
function attackedBy(chess: Chess, from: string, side: Color): Set<string> {
  const out = new Set<string>();
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && p.color === side && chess.attackers(p.square, p.color === "w" ? "b" : "w").includes(from as Square)) {
        out.add(p.square);
      }
    }
  }
  return out;
}

/** Explains `move`, played in the position `fenBefore`, from the point of view of the side that didn't play it ("your"). */
export function explainMove(fenBefore: string, move: PlayedMove): MoveExplanation {
  const before = new Chess(fenBefore);
  const mover = before.turn() as Color;
  const you: Color = mover === "w" ? "b" : "w";
  const piece = before.get(move.from as Square)!;
  const target = before.get(move.to as Square);
  const after = new Chess(move.fenAfter);
  const name = PIECE[piece.type];

  // What the move did.
  let action: string;
  if (move.san.startsWith("O-O")) {
    action = "castles, tucking its king away safely and bringing a rook towards the centre";
  } else if (move.promotion) {
    action = `pushes a pawn to the last row and turns it into a ${PIECE[move.promotion]}`;
  } else if (target) {
    action = `takes your ${PIECE[target.type]} on ${move.to} with its ${name}`;
  } else if (move.san.includes("x")) {
    action = `takes your pawn en passant with its pawn`;
  } else if ((piece.type === "n" || piece.type === "b") && (move.from[1] === "1" || move.from[1] === "8")) {
    action = `brings its ${name} into the game (${move.from} to ${move.to})`;
  } else if (piece.type === "p" && CENTRE.has(move.to)) {
    action = `pushes a pawn to ${move.to}, taking space in the centre`;
  } else {
    action = `moves its ${name} from ${move.from} to ${move.to}`;
  }

  // New attacks by the moved piece (the king is covered by "check").
  const movedType = move.promotion ?? piece.type;
  const was = move.san.startsWith("O-O") ? new Set<string>() : attackedBy(before, move.from, you);
  const now = attackedBy(after, move.to, you);
  const attacks: NewAttack[] = [...now]
    .filter((sq) => !was.has(sq))
    .map((sq) => {
      const p = after.get(sq as Square)!;
      return {
        square: sq,
        piece: p.type,
        unprotected: after.attackers(sq as Square, you).length === 0,
        worthMore: VALUE[p.type] > VALUE[movedType],
      };
    })
    .filter((a) => a.piece !== "k")
    .sort((a, b) => VALUE[b.piece] - VALUE[a.piece])
    .slice(0, 2);

  const captured = Boolean(target) || move.san.includes("x");
  return {
    action,
    check: after.inCheck(),
    checkmate: after.isCheckmate(),
    attacks,
    canRecapture: captured && !after.isCheckmate() && after.attackers(move.to as Square, you).length > 0,
  };
}

/** The explanation as short sentences, ready to show. */
export function describeExplanation(e: MoveExplanation, moveSan: string): string[] {
  const lines = [`It ${e.action}.`];
  if (e.checkmate) {
    lines.push("That's checkmate.");
    return lines;
  }
  if (e.check) lines.push("Check! Your king must get out of check first.");
  for (const a of e.attacks) {
    const note = a.unprotected ? " It isn't protected!" : a.worthMore ? " It's worth more than the piece attacking it." : "";
    if (a.unprotected || a.worthMore) lines.push(`Now ${moveSan} attacks your ${PIECE[a.piece]} on ${a.square}.${note}`);
  }
  if (e.canRecapture) lines.push("Can you take back?");
  return lines;
}

/**
 * The same position, but with the other side to move: a "null move".
 * Asking the engine for its best move here shows what the side that just
 * moved is threatening. Returns null when that isn't allowed: if the side to
 * move is in check, passing would leave its king in check.
 */
export function nullMoveFen(fen: string): string | null {
  if (new Chess(fen).inCheck()) return null;
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-"; // no en passant after a pass
  const flipped = parts.join(" ");
  try {
    const c = new Chess(flipped);
    // The side now to move must not be able to take the opponent's king.
    return c.isGameOver() && !c.isCheckmate() && !c.isStalemate() ? null : flipped;
  } catch {
    return null;
  }
}

/** Describes a threat (a move the bot would like to play next) in words. */
export function describeThreat(fen: string, uci: string): string {
  const c = new Chess(fen);
  const target = c.get(uci.slice(2, 4) as Square);
  const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
  if (c.isCheckmate()) return `checkmate with ${m.san}`;
  if (target) return `to take your ${PIECE[target.type]} on ${m.to} (${m.san})`;
  if (c.inCheck()) return `${m.san}, with check`;
  return m.san;
}
