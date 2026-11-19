"use client";

import { useMemo, useState } from "react";
import { ChessBoard, type Orientation } from "@/components/board/ChessBoard";
import { buildSquareStyles } from "@/components/board/highlights";
import { ARROW } from "@/components/board/theme";
import { IDLE } from "@/lib/chess/clickToMove";
import { checkedKingSquare } from "@/lib/chess/rules";
import { allLines, moveLabel } from "@/lib/openings/navigate";
import { OPENING_ROOT, type Opening } from "@/lib/openings/types";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { OpeningNote } from "./OpeningNote";
import { LineList } from "./LineList";

const NEXT_ARROW = ARROW.next; // blue: the move that comes next

/**
 * Learn: a guided walkthrough of one line, one move at a time, with an
 * explanation for each move. A blue arrow shows the next move.
 */
export function LearnMode({ opening }: { opening: Opening }) {
  const lines = useMemo(() => allLines(opening), [opening]);
  const [lineIndex, setLineIndex] = useState(0);
  const [step, setStep] = useState(0); // number of moves played along the line
  const [showNext, setShowNext] = useState(true);
  const [orientation, setOrientation] = useState<Orientation>("white");

  const line = lines[lineIndex];
  const node = opening.nodes[step === 0 ? OPENING_ROOT : line.ids[step - 1]];
  const next = step < line.ids.length ? opening.nodes[line.ids[step]] : null;

  const back = () => setStep((s) => Math.max(0, s - 1));
  const forward = () => setStep((s) => Math.min(line.ids.length, s + 1));
  useKeyboardNav({ back, forward, start: () => setStep(0), end: () => setStep(line.ids.length) });

  function chooseLine(i: number) {
    setLineIndex(i);
    setStep(0);
  }

  const arrows = next && showNext ? [{ from: next.uci!.slice(0, 2), to: next.uci!.slice(2, 4), color: NEXT_ARROW }] : [];
  const squareStyles = buildSquareStyles({
    click: IDLE,
    lastMove: node.uci ? { from: node.uci.slice(0, 2), to: node.uci.slice(2, 4) } : null,
    checkSquare: checkedKingSquare(node.fen),
  });

  return (
    <div className="layout">
      <section className="board">
        <ChessBoard fen={node.fen} orientation={orientation} squareStyles={squareStyles} arrows={arrows} />
      </section>

      <aside className="panel">
        <div className="card">
          <h2>{line.name}</h2>
          <p className="muted">
            Move {step} of {line.ids.length}
          </p>
          <progress value={step} max={line.ids.length} />
          <div className="nav">
            <button onClick={() => setStep(0)} disabled={step === 0} title="Start (Home)">⏮</button>
            <button onClick={back} disabled={step === 0} title="Back (←)">◀</button>
            <button onClick={forward} disabled={!next} title="Next (→)">
              {next ? `${moveLabel(next)} ▶` : "End of line"}
            </button>
          </div>
          <div className="buttons">
            <label className="toggle">
              <input type="checkbox" checked={showNext} onChange={(e) => setShowNext(e.target.checked)} />
              Show the next move as an arrow
            </label>
            <button onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}>Flip board</button>
          </div>
        </div>

        <OpeningNote node={node} intro={opening.intro} />
        {!next && step > 0 && (
          <p className="hint">
            End of this line. Pick another line below, or try it yourself in Explore mode.
          </p>
        )}

        <LineList lines={lines} selected={lineIndex} onSelect={chooseLine} />
      </aside>
    </div>
  );
}
