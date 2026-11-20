import { describe, expect, it } from "vitest";
import { STARTING_FEN } from "@/lib/chess/fen";
import { makeMove, importPgn, type PlayedMove } from "@/lib/chess/rules";
import { BOT_LEVELS, chooseBotMove, levelById, scoreFor, type Candidate } from "./levels";
import { canTakeBack, pgnResult, resultOf, takeBack, toPgn, type BotGame } from "./game";

const cp = (n: number) => ({ type: "cp" as const, cp: n });

/** Plays moves given as "e2e4 e7e5 ..." from the start. */
function moves(uci: string): PlayedMove[] {
  const out: PlayedMove[] = [];
  let fen = STARTING_FEN;
  for (const u of uci.split(" ").filter(Boolean)) {
    const m = makeMove(fen, { from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] as "q" | undefined })!;
    out.push(m);
    fen = m.fenAfter;
  }
  return out;
}

/** A random() that returns these numbers in turn. */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe("bot levels", () => {
  it("go from weakest to strongest", () => {
    expect(BOT_LEVELS.map((l) => l.id)).toEqual(["pawn", "knight", "bishop", "rook", "queen"]);
    for (let i = 1; i < BOT_LEVELS.length; i++) {
      expect(BOT_LEVELS[i].depth).toBeGreaterThan(BOT_LEVELS[i - 1].depth);
      expect(BOT_LEVELS[i].slipChance).toBeLessThanOrEqual(BOT_LEVELS[i - 1].slipChance);
    }
    expect(levelById("nonsense").id).toBe("pawn");
  });

  it("scores from the bot's side, with mates beyond any normal score", () => {
    expect(scoreFor(cp(120), "w")).toBe(120);
    expect(scoreFor(cp(120), "b")).toBe(-120);
    expect(scoreFor({ type: "mate", winner: "b", moves: 2 }, "b")).toBe(9998);
    expect(scoreFor({ type: "mate", winner: "b", moves: 2 }, "w")).toBe(-9998);
  });
});

describe("chooseBotMove", () => {
  const candidates: Candidate[] = [
    { uci: "e2e4", score: cp(40) },
    { uci: "d2d4", score: cp(30) },
    { uci: "g2g4", score: cp(-150) },
  ];

  it("the Queen always plays the best move", () => {
    expect(chooseBotMove(candidates, "w", levelById("queen"), seq(0.99))).toBe("e2e4");
  });

  it("weaker levels usually play good moves, and sometimes worse ones", () => {
    const pawn = levelById("pawn");
    // No slip (first number ≥ slipChance), then the weighted pick.
    expect(chooseBotMove(candidates, "w", pawn, seq(0.9, 0))).toBe("e2e4");
    expect(chooseBotMove(candidates, "w", pawn, seq(0.9, 0.999))).toBe("g2g4");
  });

  it("a slip can pick any candidate, but not one that walks into mate", () => {
    const pawn = levelById("pawn");
    const withMate: Candidate[] = [
      { uci: "e2e4", score: cp(0) },
      { uci: "f2f3", score: { type: "mate", winner: "b", moves: 1 } }, // gets mated
    ];
    for (const r of [0, 0.5, 0.99]) expect(chooseBotMove(withMate, "w", pawn, seq(0, r))).toBe("e2e4");
  });

  it("almost never misses a mate in one when it doesn't slip", () => {
    const mate: Candidate[] = [
      { uci: "d8h4", score: { type: "mate", winner: "b", moves: 1 } },
      { uci: "e7e5", score: cp(0) },
    ];
    expect(chooseBotMove(mate, "b", levelById("pawn"), seq(0.9, 0.99))).toBe("d8h4");
  });
});

describe("a game against the bot", () => {
  const foolsMate = moves("f2f3 e7e5 g2g4 d8h4"); // Black mates on move 2

  it("knows who won, from the player's side", () => {
    expect(resultOf({ startFen: STARTING_FEN, moves: foolsMate, player: "b" })).toEqual({ kind: "win", reason: "checkmate" });
    expect(resultOf({ startFen: STARTING_FEN, moves: foolsMate, player: "w" })).toEqual({ kind: "loss", reason: "checkmate" });
    expect(resultOf({ startFen: STARTING_FEN, moves: [], player: "w", ended: { kind: "resigned" } }).kind).toBe("loss");
  });

  it("spots a draw by repetition", () => {
    const g: BotGame = { startFen: STARTING_FEN, moves: moves("g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8"), player: "w" };
    expect(resultOf(g)).toEqual({ kind: "draw", reason: "threefold repetition" });
  });

  it("taking back removes the bot's reply and your move", () => {
    const g: BotGame = { startFen: STARTING_FEN, moves: moves("e2e4 e7e5"), player: "w" };
    expect(takeBack(g).moves).toEqual([]);
    // Bot hasn't replied yet: only your move goes.
    expect(takeBack({ ...g, moves: moves("e2e4 e7e5 g1f3") }).moves.map((m) => m.san)).toEqual(["e4", "e5"]);
    // Playing Black: the bot's first move stays.
    const asBlack: BotGame = { startFen: STARTING_FEN, moves: moves("e2e4 e7e5 g1f3"), player: "b" };
    expect(takeBack(asBlack).moves.map((m) => m.san)).toEqual(["e4"]);
    expect(canTakeBack({ ...asBlack, moves: moves("e2e4") })).toBe(false);
  });

  it("writes a PGN that the review can read back, with the result", () => {
    const g: BotGame = { startFen: STARTING_FEN, moves: foolsMate, player: "b" };
    const pgn = toPgn(g, { player: "You", bot: "Bot (Pawn)" }, new Date(2026, 10, 20));
    expect(pgn).toContain('[White "Bot (Pawn)"]');
    expect(pgn).toContain('[Date "2026.11.20"]');
    expect(pgnResult(g)).toBe("0-1");
    const back = importPgn(pgn);
    expect(back.ok && back.game.moves.map((m) => m.san)).toEqual(["f3", "e5", "g4", "Qh4#"]);
  });

  it("adds the result to the moves when you resign", () => {
    const g: BotGame = { startFen: STARTING_FEN, moves: moves("e2e4 e7e5"), player: "w", ended: { kind: "resigned" } };
    expect(toPgn(g, { player: "You", bot: "Bot" }).trimEnd().endsWith("0-1")).toBe(true);
  });
});
