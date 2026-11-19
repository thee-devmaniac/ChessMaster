"use client";

import { useEffect, useRef } from "react";
import type { GameTree } from "@/lib/chess/tree";
import { moveListModel, type Cell } from "@/lib/chess/moveListModel";
import { SYMBOL, type Classification } from "@/lib/review/classify";

interface Props {
  tree: GameTree;
  /** Node currently on screen. */
  current: string;
  onSelect: (id: string) => void;
  /** Review verdicts by node id, shown as ?!, ? and ?? after the move. */
  annotations?: Record<string, Classification>;
}

/**
 * The move list: the main line in two columns, with variations in brackets
 * underneath the move they replace. Click any move to jump to it.
 */
export function MoveList({ tree, current, onSelect, annotations }: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current move visible when stepping through a long game.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const items = moveListModel(tree);
  if (items.length === 0) {
    return <p className="muted">No moves yet. Click a piece, then click where it should go.</p>;
  }

  const moveButton = (id: string, text: string, className: string) => {
    const verdict = annotations?.[id];
    return (
      <button
        key={id}
        className={`${className} ${id === current ? "move-active" : ""}`}
        ref={id === current ? activeRef : undefined}
        onClick={() => onSelect(id)}
      >
        {text}
        {verdict && verdict !== "good" && (
          <span className={`annotation annotation-${verdict}`}>{SYMBOL[verdict]}</span>
        )}
      </button>
    );
  };

  const cell = (c?: Cell) => (c ? moveButton(c.id, c.san, "move") : <span className="move move-empty">{"…"}</span>);

  return (
    <div className="move-list" role="list">
      {items.map((item, i) =>
        item.kind === "row" ? (
          <div className="move-row" role="listitem" key={i}>
            <span className="move-number">{item.number}.</span>
            {cell(item.white)}
            {cell(item.black)}
          </div>
        ) : (
          <div className="variations" key={i}>
            {item.lines.map((line, j) => (
              <div className="variation" key={j}>
                {"("}
                {line.map((t, k) =>
                  t.kind === "move" ? (
                    moveButton(t.id, t.text, "move-inline")
                  ) : (
                    <span key={`${t.kind}-${k}`} className="bracket">
                      {t.kind === "open" ? "(" : ")"}
                    </span>
                  ),
                )}
                {")"}
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
