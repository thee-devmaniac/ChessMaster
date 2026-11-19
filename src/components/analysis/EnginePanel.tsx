"use client";

import type { LiveEval } from "@/hooks/useLiveAnalysis";
import { formatScore } from "@/lib/engine/score";
import { lineToSan } from "@/lib/chess/rules";

interface Props {
  live: LiveEval | null;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  engineError: string | null;
  engineLoading: boolean;
  gameOver: boolean;
}

/** Shows the engine's view of the position on screen. */
export function EnginePanel({ live, enabled, onToggle, engineError, engineLoading, gameOver }: Props) {
  let body: React.ReactNode;
  if (engineError) body = <p className="error">Engine failed to load: {engineError}</p>;
  else if (!enabled) body = <p className="muted">Engine off.</p>;
  else if (gameOver) body = <p className="muted">Game over: nothing to analyse.</p>;
  else if (engineLoading) body = <p className="muted">Loading engine…</p>;
  else if (!live) body = <p className="muted">Thinking…</p>;
  else {
    const line = lineToSan(live.fen, live.pv, 6);
    body = (
      <>
        <p className="engine-line">
          <strong className="engine-score">{formatScore(live.score)}</strong>
          <span className="muted">
            depth {live.depth}
            {live.final ? "" : " (thinking…)"}
          </span>
        </p>
        {line.length > 0 && (
          <p className="engine-pv">
            Best: <strong>{line[0]}</strong> {line.slice(1).join(" ")}
          </p>
        )}
      </>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Engine</h2>
        <label className="toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          Show evaluation &amp; best move
        </label>
      </div>
      {body}
    </section>
  );
}
