"use client";

import { useState } from "react";
import { ChessBoard, type Orientation } from "@/components/board/ChessBoard";
import { STARTING_FEN, checkFen } from "@/lib/chess/fen";

/**
 * Milestone 1: a static board rendered from a FEN.
 * No moves yet. Paste a FEN, press Load, and the board shows that position.
 */
export default function Home() {
  const [fen, setFen] = useState(STARTING_FEN);
  const [draft, setDraft] = useState(STARTING_FEN);
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("white");

  function loadFen() {
    const result = checkFen(draft);
    if (result.ok) {
      setFen(result.fen);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="layout">
      <section className="board">
        <ChessBoard fen={fen} orientation={orientation} />
      </section>

      <aside className="panel">
        <h1>Chess Trainer</h1>

        <label htmlFor="fen">Position (FEN)</label>
        <textarea
          id="fen"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
        />
        {error && <p className="error">{error}</p>}

        <div className="buttons">
          <button onClick={loadFen}>Load FEN</button>
          <button
            onClick={() => {
              setDraft(STARTING_FEN);
              setFen(STARTING_FEN);
              setError(null);
            }}
          >
            Reset
          </button>
          <button
            onClick={() =>
              setOrientation((o) => (o === "white" ? "black" : "white"))
            }
          >
            Flip board
          </button>
        </div>

        <p className="muted">Showing: {fen}</p>
      </aside>
    </main>
  );
}
