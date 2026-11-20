import { Chess, type Square as ChessJsSquare } from "chess.js";
import { parseClockComment, parseTimeControl, type TimeControl } from "./clock";

/**
 * The rules layer. Every function takes a FEN and returns plain data, so the
 * rest of the app never imports chess.js. These are "pure" functions: same
 * input, same output, nothing changed behind the scenes. That makes them easy
 * to test and safe to call from React.
 */

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PromotionPiece = "q" | "r" | "b" | "n";

export interface Piece {
  color: Color;
  type: PieceType;
}

/** One place the selected piece can go. */
export interface Target {
  to: string;
  /** True if a piece is captured, including en passant (where the target square looks empty). */
  isCapture: boolean;
  /** True if this is a pawn reaching the last rank, so the player must choose a piece. */
  isPromotion: boolean;
}

/** A move request coming from the UI. */
export interface MoveInput {
  from: string;
  to: string;
  promotion?: PromotionPiece;
}

/** A move that was played, plus the position after it. */
export interface PlayedMove {
  from: string;
  to: string;
  promotion?: PromotionPiece;
  /** Standard notation for people: "Nf3", "exd5", "O-O", "e8=Q+". */
  san: string;
  /** Engine notation: "g1f3", "e7e8q". */
  uci: string;
  fenAfter: string;
  /** Time left on the mover's clock after this move, in ms, when the PGN recorded it. */
  clockMs?: number;
}

export type GameStatus =
  | { kind: "playing"; turn: Color; inCheck: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: "insufficient material" | "fifty-move rule" | "threefold repetition" };

export function pieceAt(fen: string, square: string): Piece | null {
  const p = new Chess(fen).get(square as ChessJsSquare);
  return p ? { color: p.color, type: p.type } : null;
}

export function turn(fen: string): Color {
  return new Chess(fen).turn();
}

/**
 * All legal destinations for the piece on `from`.
 * chess.js returns one move per promotion choice (4 moves to the same square),
 * so we merge them into one target.
 */
export function legalTargets(fen: string, from: string): Target[] {
  const moves = new Chess(fen).moves({ square: from as ChessJsSquare, verbose: true });
  const byTo = new Map<string, Target>();
  for (const m of moves) {
    if (!byTo.has(m.to)) {
      byTo.set(m.to, {
        to: m.to,
        // chess.js's isCapture() is false for en passant, so check both.
        isCapture: m.isCapture() || m.isEnPassant(),
        isPromotion: m.isPromotion(),
      });
    }
  }
  return [...byTo.values()];
}

/** Plays a move. Returns null if the move is illegal: the caller never gets an illegal position. */
export function makeMove(fen: string, input: MoveInput): PlayedMove | null {
  const chess = new Chess(fen);
  try {
    const m = chess.move({ from: input.from, to: input.to, promotion: input.promotion });
    return {
      from: m.from,
      to: m.to,
      promotion: m.promotion as PromotionPiece | undefined,
      san: m.san,
      uci: m.lan,
      fenAfter: chess.fen(),
    };
  } catch {
    return null; // chess.js throws on illegal moves
  }
}

/**
 * Is the game over, and why?
 *
 * Note: threefold repetition (the same position three times = draw) cannot be
 * seen from one FEN, because it needs the game's history. See
 * isThreefoldRepetition() below, which game.ts combines with this.
 */
export function gameStatus(fen: string): GameStatus {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    // The side to move has been checkmated, so the other side won.
    return { kind: "checkmate", winner: chess.turn() === "w" ? "b" : "w" };
  }
  if (chess.isStalemate()) return { kind: "stalemate" };
  if (chess.isInsufficientMaterial()) return { kind: "draw", reason: "insufficient material" };
  if (chess.isDrawByFiftyMoves()) return { kind: "draw", reason: "fifty-move rule" };
  return { kind: "playing", turn: chess.turn(), inCheck: chess.inCheck() };
}

/** The square of the king that is in check, or null. Used to highlight it red. */
export function checkedKingSquare(fen: string): string | null {
  const chess = new Chess(fen);
  if (!chess.inCheck()) return null;
  return chess.findPiece({ type: "k", color: chess.turn() })[0] ?? null;
}

/**
 * True if the latest position has now occurred three times (a draw).
 * Unlike the other checks, this needs the whole game, so we replay it.
 */
export function isThreefoldRepetition(startFen: string, moves: MoveInput[]): boolean {
  const chess = new Chess(startFen);
  for (const m of moves) chess.move({ from: m.from, to: m.to, promotion: m.promotion });
  return chess.isThreefoldRepetition();
}

export interface ImportedGame {
  startFen: string;
  moves: PlayedMove[];
  /** PGN header tags, e.g. { White: "player1", Black: "player2", Result: "1-0" }. */
  headers: Record<string, string>;
  /** The clock settings, from the TimeControl header, if the game had a normal clock. */
  timeControl?: TimeControl;
}

export type PgnImport = { ok: true; game: ImportedGame } | { ok: false; error: string };

/**
 * Reads a PGN: the standard text format for a whole game. Chess.com and
 * Lichess both let you download any game as PGN. Comments such as clock
 * times {[%clk 0:09:58]} and annotations such as "??" are ignored.
 */
export function importPgn(text: string): PgnImport {
  const chess = new Chess();
  try {
    chess.loadPgn(text);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read PGN" };
  }
  const history = chess.history({ verbose: true });
  const headers = chess.getHeaders();
  // Clock comments are stored by the full position after each move (move counters
  // included), so every comment belongs to exactly one move.
  const commentAfter = new Map(chess.getComments().map((c) => [c.fen, c.comment]));
  if (history.length === 0 && !headers.FEN) {
    return { ok: false, error: "No moves found in the PGN" };
  }
  return {
    ok: true,
    game: {
      startFen: history[0]?.before ?? chess.fen(),
      moves: history.map((m) => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion as PromotionPiece | undefined,
        san: m.san,
        uci: m.lan,
        fenAfter: m.after,
        clockMs: parseClockComment(commentAfter.get(m.after)),
      })),
      headers,
      timeControl: parseTimeControl(headers.TimeControl),
    },
  };
}

/** Converts an engine move ("g8f6", "e7e8q") to SAN ("Nf6", "e8=Q") in a position. */
export function uciToSan(fen: string, uci: string): string | null {
  const played = makeMove(fen, {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as PromotionPiece | undefined) || undefined,
  });
  return played?.san ?? null;
}

/** Converts the first `max` moves of an engine line to SAN, e.g. ["Qe7", "Nf3", "d6"]. */
export function lineToSan(fen: string, uciMoves: string[], max = 6): string[] {
  const sans: string[] = [];
  for (const uci of uciMoves.slice(0, max)) {
    const played = makeMove(fen, {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: (uci[4] as PromotionPiece | undefined) || undefined,
    });
    if (!played) break;
    sans.push(played.san);
    fen = played.fenAfter;
  }
  return sans;
}
