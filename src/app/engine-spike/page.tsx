"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChessBoard } from "@/components/board/ChessBoard";
import { StockfishEngine } from "@/lib/engine/StockfishEngine";
import { createStockfishWorker } from "@/lib/engine/createStockfishWorker";
import { formatScore } from "@/lib/engine/score";
import type { Analysis } from "@/lib/engine/types";

/**
 * Milestone 2: engine spike.
 * Proves Stockfish runs in a Web Worker and that scores come out from
 * White's point of view, using positions where we already know the answer.
 */
const TEST_POSITIONS = [
  {
    label: "White is a queen up, Black to move",
    fen: "r5k1/5ppp/8/8/8/8/PPPPQPPP/R3R1K1 b - - 0 1",
    expect: "Big plus score (White winning), even though it is Black's turn",
  },
  {
    label: "Black is a queen up, White to move",
    fen: "r3r1k1/ppppqppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    expect: "Big minus score (Black winning)",
  },
  {
    label: "Black to move, back-rank mate in one",
    fen: "3qr1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1",
    expect: "-M1 and best move d8d1 (queen to d1, checkmate)",
  },
];

const DEPTH = 14;

export default function EngineSpikePage() {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [status, setStatus] = useState("Loading engine…");
  const [results, setResults] = useState<(Analysis | null)[]>(TEST_POSITIONS.map(() => null));
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);

  // Create the engine once when the page opens, and shut it down when it closes.
  useEffect(() => {
    const engine = new StockfishEngine(createStockfishWorker);
    engineRef.current = engine;
    engine
      .whenReady()
      .then(() => setStatus("Engine ready"))
      .catch((e) => setStatus(`Engine failed: ${e.message}`));
    return () => engine.dispose();
  }, []);

  async function analyseAll() {
    const engine = engineRef.current;
    if (!engine) return;
    setRunning(true);
    setResults(TEST_POSITIONS.map(() => null));
    // One position at a time: the engine can only think about one thing at once.
    for (let i = 0; i < TEST_POSITIONS.length; i++) {
      setStatus(`Analysing position ${i + 1} of ${TEST_POSITIONS.length}…`);
      const result = await engine.analyse(TEST_POSITIONS[i].fen, { depth: DEPTH });
      setResults((prev) => prev.map((r, j) => (j === i ? result : r)));
    }
    setStatus("Done");
    setRunning(false);
  }

  const current = results[selected];
  const arrow =
    current?.bestMove != null
      ? [{ from: current.bestMove.slice(0, 2), to: current.bestMove.slice(2, 4) }]
      : [];

  return (
    <main className="layout">
      <section className="board">
        <ChessBoard fen={TEST_POSITIONS[selected].fen} arrows={arrow} />
      </section>

      <aside className="panel">
        <h1>Engine spike</h1>
        <p className="muted">
          Stockfish 19 lite (WASM) in a Web Worker, depth {DEPTH}. Scores are from
          White&apos;s point of view.
        </p>
        <p>
          <strong>Status:</strong> {status}
        </p>
        <div className="buttons">
          <button onClick={analyseAll} disabled={running || status === "Loading engine…"}>
            Analyse all
          </button>
          <Link href="/analyse">Back to the board</Link>
        </div>

        <table className="results">
          <thead>
            <tr>
              <th>Position</th>
              <th>Eval</th>
              <th>Best</th>
              <th>Depth</th>
            </tr>
          </thead>
          <tbody>
            {TEST_POSITIONS.map((p, i) => (
              <tr
                key={p.fen}
                onClick={() => setSelected(i)}
                className={i === selected ? "selected" : undefined}
              >
                <td>
                  {p.label}
                  <div className="muted">Expected: {p.expect}</div>
                </td>
                <td>{results[i] ? formatScore(results[i].score) : "…"}</td>
                <td>{results[i] ? (results[i].bestMove ?? "none") : "…"}</td>
                <td>{results[i]?.depth ?? "…"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Click a row to show that position and its best-move arrow.</p>
      </aside>
    </main>
  );
}
