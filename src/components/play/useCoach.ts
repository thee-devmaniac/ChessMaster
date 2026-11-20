"use client";

import { useEffect, useRef, useState } from "react";
import { useStockfish } from "@/hooks/useStockfish";
import { describeExplanation, describeThreat, explainMove, nullMoveFen } from "@/lib/coach/explain";
import { COACH_DEPTH, COACH_MAX_MS, botSlipped, isRealThreat, judgeMove, type CoachVerdict } from "@/lib/coach/verdict";
import { gameStatus, type PlayedMove } from "@/lib/chess/rules";
import type { Classification } from "@/lib/review/classify";
import type { Analysis, Color } from "@/lib/engine/types";

/** How deep the coach looks for the bot's threats (a little less than for verdicts: it only needs the idea). */
const THREAT_DEPTH = 10;

/** "12." for White's move, "12..." for Black's, then the move. */
export function moveLabel(fenBefore: string, san: string): string {
  const [, side, , , , number] = fenBefore.split(" ");
  return `${number}${side === "w" ? "." : "..."} ${san}`;
}

/** The coach's verdict on the player's latest move. `forFen` is the position after it. */
export type VerdictState =
  | { forFen: string; label: string; status: "checking" }
  | { forFen: string; label: string; status: "done"; v: CoachVerdict };

/** The coach's explanation of the bot's latest move. */
export interface BotNote {
  forFen: string;
  label: string;
  lines: string[];
  status: "checking" | "done";
  /** What the bot threatens next, in words, if anything real. */
  threat?: string;
  /** The bot's move handed the player a chance. */
  slipped?: boolean;
}

export const needsDecision = (v: CoachVerdict) => v.classification === "mistake" || v.classification === "blunder";

/**
 * Coach mode's thinking: its own engine (only started while coach mode is
 * on), a cache of evaluations, the verdict on your moves and the
 * explanation of the bot's. The Play page calls onPlayerMove / onBotMove
 * after each move and reads `verdict` and `botNote` to show them.
 */
export function useCoach(enabled: boolean) {
  const { engine } = useStockfish(enabled);
  // Read from inside async work, so it always sees the current engine.
  const engineRef = useRef(engine);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  const cache = useRef(new Map<string, Analysis>());
  const [verdict, setVerdict] = useState<VerdictState | null>(null);
  const [botNote, setBotNote] = useState<BotNote | null>(null);
  // Verdicts by the position after each of your moves, for the ?! ? ?? marks in the move list.
  const [marks, setMarks] = useState<Record<string, Classification>>({});

  async function evaluate(fen: string): Promise<Analysis> {
    const hit = cache.current.get(fen);
    if (hit) return hit;
    const engine = engineRef.current;
    if (!engine) throw new Error("The coach's engine isn't ready");
    const a = await engine.analyse(fen, { depth: COACH_DEPTH, maxMs: COACH_MAX_MS });
    cache.current.set(fen, a);
    return a;
  }

  /** Judges the player's move. Until it's done, the bot waits (see the Play page). */
  function onPlayerMove(fenBefore: string, move: PlayedMove, mover: Color) {
    if (!enabled || !engineRef.current) return;
    const forFen = move.fenAfter;
    const label = moveLabel(fenBefore, move.san);
    setVerdict({ forFen, label, status: "checking" });
    setBotNote(null); // its warnings were about the position you just left
    (async () => {
      try {
        const before = await evaluate(fenBefore);
        const after = await evaluate(forFen);
        const v = judgeMove(fenBefore, move.uci, before, after, mover);
        setVerdict((cur) => (cur?.forFen === forFen ? { forFen, label, status: "done", v } : cur));
        setMarks((m) => ({ ...m, [forFen]: v.classification }));
      } catch {
        // Cancelled (you took the move back) or the engine failed: no verdict, and the bot is not held up.
        setVerdict((cur) => (cur?.forFen === forFen ? null : cur));
      }
    })();
  }

  /** Explains the bot's move, then looks for what it threatens next. */
  function onBotMove(fenBefore: string, move: PlayedMove, bot: Color) {
    if (!enabled) return;
    const forFen = move.fenAfter;
    const lines = describeExplanation(explainMove(fenBefore, move), move.san);
    const note: BotNote = { forFen, label: moveLabel(fenBefore, move.san), lines, status: "checking" };
    setBotNote(note);
    if (gameStatus(forFen).kind !== "playing" || !engineRef.current) {
      setBotNote({ ...note, status: "done" });
      return;
    }
    const player: Color = bot === "w" ? "b" : "w";
    (async () => {
      let threat: string | undefined;
      let slipped = false;
      try {
        const now = await evaluate(forFen);
        const prev = cache.current.get(fenBefore);
        slipped = prev !== undefined && botSlipped(prev.score, now.score, player);
        const passFen = nullMoveFen(forFen);
        if (passFen && !slipped) {
          const ifBotMovedAgain = await engineRef.current!.analyse(passFen, { depth: THREAT_DEPTH, maxMs: COACH_MAX_MS });
          if (ifBotMovedAgain.bestMove && isRealThreat(now.score, ifBotMovedAgain.score, bot)) {
            threat = describeThreat(passFen, ifBotMovedAgain.bestMove);
          }
        }
      } catch {
        // Cancelled because you moved first: the explanation stays, without the threat.
      }
      setBotNote((cur) => (cur?.forFen === forFen ? { ...cur, threat, slipped, status: "done" } : cur));
    })();
  }

  /** After a take-back: forget the verdict, and keep the bot's note only if its position is back on the board. */
  function onTakeBack(fenNow: string) {
    engineRef.current?.cancel();
    setVerdict(null);
    setBotNote((n) => (n?.forFen === fenNow ? n : null));
  }

  function reset() {
    engineRef.current?.cancel();
    setVerdict(null);
    setBotNote(null);
    setMarks({});
  }

  return { ready: engine !== null, verdict, botNote, marks, onPlayerMove, onBotMove, onTakeBack, reset };
}
