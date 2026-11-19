"use client";

import { useEffect, useRef } from "react";
import { moveRows, type GameRecord } from "@/lib/chess/game";
import { SYMBOL, type Classification } from "@/lib/review/classify";

interface Props {
  game: GameRecord;
  /** Ply currently on screen (0 = start). */
  view: number;
  onSelect: (ply: number) => void;
  /** Review verdicts by ply, shown as ?!, ? and ?? after the move. */
  annotations?: Record<number, Classification>;
}

/** The move list in "1. e4 e5  2. Nf3 Nc6" form. Click a move to jump to it. */
export function MoveList({ game, view, onSelect, annotations }: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current move visible when stepping through a long game.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [view]);

  if (game.moves.length === 0) {
    return <p className="muted">No moves yet. Click a piece, then click where it should go.</p>;
  }

  const cell = (m?: { san: string; ply: number }) =>
    m ? (
      <button
        className={`move ${m.ply === view ? "move-active" : ""}`}
        ref={m.ply === view ? activeRef : undefined}
        onClick={() => onSelect(m.ply)}
      >
        {m.san}
        {annotations?.[m.ply] && annotations[m.ply] !== "good" && (
          <span className={`annotation annotation-${annotations[m.ply]}`}>{SYMBOL[annotations[m.ply]]}</span>
        )}
      </button>
    ) : (
      <span className="move move-empty">{"…"}</span>
    );

  return (
    <ol className="move-list">
      {moveRows(game).map((row) => (
        <li key={row.number}>
          <span className="move-number">{row.number}.</span>
          {cell(row.white)}
          {cell(row.black)}
        </li>
      ))}
    </ol>
  );
}
