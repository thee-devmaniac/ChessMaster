import type { Color, Score } from "@/lib/engine/types";

/**
 * The bot's strength levels.
 *
 * Stockfish's own strength limit (UCI_Elo) can't go below 1320, far too
 * strong for a beginner, so the lower levels weaken it themselves:
 *  - `depth`: how far ahead it looks (shallow = misses tactics)
 *  - `multiPv`: how many of its top moves it considers
 *  - `temperatureCp`: how willing it is to play a move that is worse than
 *    its best (in centipawns; higher = more willing)
 *  - `slipChance`: how often it plays any of its candidate moves, good or
 *    not, like a beginner who didn't see the threat
 * Every move it plays is still one of the engine's candidates, so it never
 * plays nonsense, just the kind of slips a learner makes. The numbers are a
 * first guess, meant to be tuned once children have played it.
 */
export interface BotLevel {
  id: "pawn" | "knight" | "bishop" | "rook" | "queen";
  name: string;
  symbol: string;
  blurb: string;
  depth: number;
  multiPv: number;
  temperatureCp: number;
  slipChance: number;
}

export const BOT_LEVELS: BotLevel[] = [
  {
    id: "pawn",
    name: "Pawn",
    symbol: "♟",
    blurb: "Just starting. Often misses threats and leaves pieces hanging.",
    depth: 3,
    multiPv: 8,
    temperatureCp: 250,
    slipChance: 0.3,
  },
  {
    id: "knight",
    name: "Knight",
    symbol: "♞",
    blurb: "Knows the basics, but still makes plenty of mistakes.",
    depth: 5,
    multiPv: 6,
    temperatureCp: 150,
    slipChance: 0.15,
  },
  {
    id: "bishop",
    name: "Bishop",
    symbol: "♝",
    blurb: "A steady club player for beginners. Punishes big blunders.",
    depth: 7,
    multiPv: 5,
    temperatureCp: 80,
    slipChance: 0.06,
  },
  {
    id: "rook",
    name: "Rook",
    symbol: "♜",
    blurb: "Strong. Rarely makes a mistake; you'll need a plan.",
    depth: 10,
    multiPv: 3,
    temperatureCp: 30,
    slipChance: 0.02,
  },
  {
    id: "queen",
    name: "Queen",
    symbol: "♛",
    blurb: "Plays its best move every time. A real challenge.",
    depth: 14,
    multiPv: 1,
    temperatureCp: 1,
    slipChance: 0,
  },
];

export function levelById(id: string): BotLevel {
  return BOT_LEVELS.find((l) => l.id === id) ?? BOT_LEVELS[0];
}

/** A score as one number from `side`'s point of view: centipawns, with mates as ±(10000 − moves). */
export function scoreFor(score: Score, side: Color): number {
  if (score.type === "mate") {
    const value = 10000 - score.moves;
    return score.winner === side ? value : -value;
  }
  return side === "w" ? score.cp : -score.cp;
}

export interface Candidate {
  /** The move in engine notation ("e2e4"). */
  uci: string;
  /** The engine's score after it, from White's point of view. */
  score: Score;
}

/**
 * Picks the bot's move from the engine's candidates (best first).
 * `random` returns numbers in [0, 1); tests pass their own to get fixed results.
 */
export function chooseBotMove(candidates: Candidate[], bot: Color, level: BotLevel, random: () => number = Math.random): string {
  if (candidates.length === 0) throw new Error("No candidate moves");
  if (candidates.length === 1 || level.multiPv === 1) return candidates[0].uci;

  const values = candidates.map((c) => scoreFor(c.score, bot));

  // A slip: any candidate, except moves that walk into a forced mate when there is another choice.
  if (random() < level.slipChance) {
    const safe = candidates.filter((_, i) => values[i] > -9000);
    const pool = safe.length > 0 ? safe : candidates;
    return pool[Math.floor(random() * pool.length)].uci;
  }

  // Otherwise: better moves are much more likely ("softmax"). A move `temperatureCp`
  // worse than the best is chosen about a third as often as the best.
  const best = Math.max(...values);
  const weights = values.map((v) => Math.exp((v - best) / level.temperatureCp));
  let target = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    target -= weights[i];
    if (target < 0) return candidates[i].uci;
  }
  return candidates[0].uci;
}
