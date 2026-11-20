"use client";

import { formatClock, formatDuration, type TimeControl } from "@/lib/chess/clock";
import type { ReviewedMove } from "@/lib/review/classify";
import { lowTimeThreshold, sideTimeReport, timeInsights, type MoveTiming } from "@/lib/review/time";
import { ClockChart } from "./ClockChart";

interface Props {
  timings: MoveTiming[];
  timeControl?: TimeControl;
  /** Review verdicts by ply along the main line (empty before a review). */
  verdicts: Map<number, ReviewedMove>;
  moveName: (ply: number) => string;
  currentPly: number | null;
  onSelect: (ply: number) => void;
}

/** "180+2" style label for the time control, in minutes. */
function tcLabel(tc?: TimeControl): string {
  if (!tc) return "time control unknown";
  const minutes = tc.baseMs / 60_000;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min${tc.incMs ? ` + ${tc.incMs / 1000}s per move` : ""}`;
}

/** Where the time went: plain-language findings, the clock chart, and a table view. */
export function TimePanel({ timings, timeControl, verdicts, moveName, currentPly, onSelect }: Props) {
  const reviewed = verdicts.size > 0;
  const insights = (["w", "b"] as const).flatMap((c) =>
    timeInsights(sideTimeReport(timings, c, verdicts), timeControl, moveName, reviewed),
  );

  return (
    <section className="card">
      <div className="card-header">
        <h2>Clock</h2>
        <span className="muted">{tcLabel(timeControl)}</span>
      </div>

      {insights.length > 0 ? (
        <ul className="insights">
          {insights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">Review the game to see which mistakes came in time trouble or were rushed.</p>
      )}

      <ClockChart
        timings={timings}
        baseMs={timeControl?.baseMs}
        lowMs={lowTimeThreshold(timeControl)}
        verdicts={verdicts}
        moveName={moveName}
        currentPly={currentPly}
        onSelect={onSelect}
      />

      {/* The same numbers as a table, so nothing depends on hovering. */}
      <details className="table-view">
        <summary>Show as table</summary>
        <table className="summary clock-table">
          <thead>
            <tr>
              <th>Move</th>
              <th>Clock after</th>
              <th>Took</th>
            </tr>
          </thead>
          <tbody>
            {timings.map((t) => (
              <tr key={t.ply} className={t.lowTime ? "row-low" : undefined}>
                <td>{moveName(t.ply)}</td>
                <td>{t.clockMs !== undefined ? formatClock(t.clockMs) : "–"}</td>
                <td>
                  {t.spentMs !== undefined ? formatDuration(t.spentMs) : "–"}
                  {t.rushed && <span className="chip">fast</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
