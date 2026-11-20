import { Chess } from "chess.js";
import { gameStatus, isThreefoldRepetition, type PlayedMove } from "@/lib/chess/rules";
import type { Color } from "@/lib/engine/types";

/**
 * A game against the bot: the moves so far, who plays which side, and how
 * it ended. Pure functions only; the Play page keeps one of these in state.
 */
export interface BotGame {
  startFen: string;
  moves: PlayedMove[];
  /** The side the player has. The bot plays the other one. */
  player: Color;
  /** Set when the player resigns or a draw is agreed (checkmate etc. come from the position). */
  ended?: { kind: "resigned" } | { kind: "draw agreed" };
}

export type BotGameResult =
  | { kind: "playing" }
  | { kind: "win" | "loss" | "draw"; reason: string };

export function fenOfGame(g: BotGame): string {
  return g.moves.length ? g.moves[g.moves.length - 1].fenAfter : g.startFen;
}

/** How the game stands, from the player's point of view. */
export function resultOf(g: BotGame): BotGameResult {
  if (g.ended?.kind === "resigned") return { kind: "loss", reason: "you resigned" };
  if (g.ended?.kind === "draw agreed") return { kind: "draw", reason: "draw agreed" };
  const status = gameStatus(fenOfGame(g));
  if (status.kind === "checkmate") {
    return status.winner === g.player ? { kind: "win", reason: "checkmate" } : { kind: "loss", reason: "checkmate" };
  }
  if (status.kind === "stalemate") return { kind: "draw", reason: "stalemate" };
  if (status.kind === "draw") return { kind: "draw", reason: status.reason };
  if (isThreefoldRepetition(g.startFen, g.moves)) return { kind: "draw", reason: "threefold repetition" };
  return { kind: "playing" };
}

/**
 * Takes back the player's last move (and the bot's reply to it, if it has
 * replied), so it is the player's turn again in the position before.
 */
export function takeBack(g: BotGame): BotGame {
  // Who made move i: the side to move in the position before it.
  const moverOf = (i: number) => new Chess(i === 0 ? g.startFen : g.moves[i - 1].fenAfter).turn() as Color;
  let last = g.moves.length - 1;
  while (last >= 0 && moverOf(last) !== g.player) last--;
  if (last < 0) return g; // you haven't moved yet: nothing to take back
  return { ...g, moves: g.moves.slice(0, last), ended: undefined };
}

/** Can the player take a move back? Only if they have made one. */
export function canTakeBack(g: BotGame): boolean {
  return takeBack(g).moves.length !== g.moves.length;
}

/** The PGN result tag for the game: "1-0", "0-1", "1/2-1/2" or "*". */
export function pgnResult(g: BotGame): string {
  const r = resultOf(g);
  if (r.kind === "playing") return "*";
  if (r.kind === "draw") return "1/2-1/2";
  const whiteWon = (r.kind === "win") === (g.player === "w");
  return whiteWon ? "1-0" : "0-1";
}

/** The game as PGN text, ready to download, send to a coach, or review. */
export function toPgn(g: BotGame, names: { player: string; bot: string }, date = new Date()): string {
  const chess = new Chess(g.startFen);
  for (const m of g.moves) chess.move(m.san);
  const pad = (n: number) => String(n).padStart(2, "0");
  chess.setHeader("Event", "Game against the bot");
  chess.setHeader("Site", "Chess Trainer");
  chess.setHeader("Date", `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`);
  chess.setHeader("White", g.player === "w" ? names.player : names.bot);
  chess.setHeader("Black", g.player === "b" ? names.player : names.bot);
  chess.setHeader("Result", pgnResult(g));
  const r = resultOf(g);
  if (r.kind !== "playing") chess.setHeader("Termination", r.reason);
  // chess.js ends the move text with the result only if it knows it; add it for resignations and agreed draws.
  const pgn = chess.pgn();
  return pgn.trimEnd().endsWith(pgnResult(g)) ? pgn : `${pgn.trimEnd()} ${pgnResult(g)}`;
}
