"use client";

import { useId, useState } from "react";
import { formatClock, formatDuration } from "@/lib/chess/clock";
import type { MoveTiming } from "@/lib/review/time";
import type { ReviewedMove } from "@/lib/review/classify";

/*
 * Each side's clock over the game: where the time went, and which mistakes
 * came in time trouble. Colours were checked with the dataviz validator against
 * the card surface (#111827): both series pass lightness, chroma, colour-blind
 * separation and contrast, and stay apart from the two status colours.
 */
const SERIES = { w: { name: "White", color: "#3987e5" }, b: { name: "Black", color: "#199e70" } } as const;
const STATUS = {
  mistake: { color: "#fab219", symbol: "?" },
  blunder: { color: "#d03b3b", symbol: "??" },
} as const;
const SURFACE = "#111827";

const W = 520;
const H = 200;
const PAD = { top: 18, right: 82, bottom: 24, left: 44 }; // right: room for "White 12:34"
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

interface Props {
  timings: MoveTiming[];
  /** Starting time, when the time control is known: both lines start there. */
  baseMs?: number;
  /** The time-trouble threshold, drawn as a band. */
  lowMs: number;
  /** Review verdicts by ply (empty before a review). */
  verdicts: Map<number, ReviewedMove>;
  /** Move names by ply, e.g. "14... Nf6". */
  moveName: (ply: number) => string;
  /** Ply on the board right now (0 = start), shown as a hairline. */
  currentPly: number | null;
  onSelect: (ply: number) => void;
}

export function ClockChart({ timings, baseMs, lowMs, verdicts, moveName, currentPly, onSelect }: Props) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const lastPly = timings.length;
  const maxClock = Math.max(baseMs ?? 0, ...timings.map((t) => t.clockMs ?? 0), 1);
  const x = (ply: number) => PAD.left + (ply / Math.max(lastPly, 1)) * PLOT_W;
  const y = (ms: number) => PAD.top + PLOT_H - (Math.min(ms, maxClock) / maxClock) * PLOT_H;

  // One polyline per side; both start at the full clock when it is known.
  const pointsFor = (color: "w" | "b") => {
    const pts: { ply: number; ms: number }[] = baseMs !== undefined ? [{ ply: 0, ms: baseMs }] : [];
    for (const t of timings) if (t.mover === color && t.clockMs !== undefined) pts.push({ ply: t.ply, ms: t.clockMs });
    return pts;
  };
  const lines = { w: pointsFor("w"), b: pointsFor("b") };

  // Clean y ticks on round clock times (whole minutes, or 15/30 s in very short games), at most 4 steps.
  const tickStep = [15, 30, 60, 120, 300, 600, 900, 1800].map((s) => s * 1000).find((s) => maxClock / s <= 4) ?? 3_600_000;
  const yTicks: number[] = [];
  for (let v = 0; v <= maxClock; v += tickStep) yTicks.push(v);
  // x ticks every 10 full moves (20 plies), or every 5 in short games.
  const step = lastPly > 60 ? 20 : 10;
  const xTicks: number[] = [];
  for (let p = step; p < lastPly; p += step) xTicks.push(p);

  // The latest clock reading for each side at a given ply (for the tooltip).
  const readingAt = (ply: number, color: "w" | "b") =>
    [...timings].reverse().find((t) => t.mover === color && t.ply <= ply && t.clockMs !== undefined);

  function plyFromPointer(e: React.MouseEvent<SVGSVGElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const ply = Math.round(((svgX - PAD.left) / PLOT_W) * lastPly);
    return Math.max(1, Math.min(lastPly, ply));
  }

  const hoverTiming = hover !== null ? timings[hover - 1] : null;
  const errors = timings.filter((t) => {
    const c = verdicts.get(t.ply)?.classification;
    return (c === "mistake" || c === "blunder") && t.clockMs !== undefined;
  });

  return (
    <figure className="clock-chart">
      <figcaption className="chart-legend" id={titleId}>
        {(["w", "b"] as const).map((c) => (
          <span key={c} className="legend-item">
            <svg width="16" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="16" y2="4" stroke={SERIES[c].color} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {SERIES[c].name}&apos;s clock
          </span>
        ))}
        {(["mistake", "blunder"] as const)
          .filter((kind) => errors.some((t) => verdicts.get(t.ply)?.classification === kind))
          .map((kind) => (
            <span key={kind} className="legend-item">
              <svg width="10" height="10" aria-hidden="true">
                <circle cx="5" cy="5" r="4" fill={STATUS[kind].color} />
              </svg>
              {STATUS[kind].symbol} {kind}
            </span>
          ))}
      </figcaption>

      <div className="chart-frame">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={titleId}
          onPointerMove={(e) => setHover(plyFromPointer(e))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => onSelect(plyFromPointer(e))}
        >
          {/* Time-trouble band: a soft wash, labelled in muted text. */}
          <rect x={PAD.left} y={y(lowMs)} width={PLOT_W} height={y(0) - y(lowMs)} fill="rgba(208, 59, 59, 0.1)" />
          <text x={PAD.left + 4} y={y(lowMs) - 4} className="chart-note">
            Time trouble (under {formatDuration(lowMs)})
          </text>

          {/* Hairline grid and axis labels. */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={y(v)} y2={y(v)} className="chart-grid" />
              <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="chart-tick">
                {formatClock(v)}
              </text>
            </g>
          ))}
          {xTicks.map((p) => (
            <text key={p} x={x(p)} y={H - 6} textAnchor="middle" className="chart-tick">
              {Math.ceil(p / 2)}
            </text>
          ))}
          <text x={PAD.left + PLOT_W} y={H - 6} textAnchor="end" className="chart-tick">
            move
          </text>

          {/* The board's current position. */}
          {currentPly !== null && currentPly > 0 && (
            <line x1={x(currentPly)} x2={x(currentPly)} y1={PAD.top} y2={PAD.top + PLOT_H} className="chart-current" />
          )}

          {/* One 2px line per side. */}
          {(["w", "b"] as const).map((c) => (
            <polyline
              key={c}
              points={lines[c].map((p) => `${x(p.ply)},${y(p.ms)}`).join(" ")}
              fill="none"
              stroke={SERIES[c].color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Direct end labels (text in text tokens; the line beside it carries the colour). */}
          {(["w", "b"] as const).map((c) => {
            const end = lines[c].at(-1);
            if (!end) return null;
            const other = lines[c === "w" ? "b" : "w"].at(-1);
            // If the two ends are close, nudge this label apart a little.
            const clash = other && Math.abs(y(end.ms) - y(other.ms)) < 12;
            const dy = clash ? (c === "w" ? -6 : 8) : 3;
            return (
              <text key={c} x={x(end.ply) + 6} y={y(end.ms) + dy} className="chart-end-label">
                {SERIES[c].name} {formatClock(end.ms)}
              </text>
            );
          })}

          {/* Mistakes and blunders: status colour + symbol, with a 2px surface ring. */}
          {errors.map((t) => {
            const kind = verdicts.get(t.ply)!.classification as "mistake" | "blunder";
            const cx = x(t.ply);
            const cy = y(t.clockMs!);
            return (
              <g key={t.ply}>
                <circle cx={cx} cy={cy} r={5} fill={STATUS[kind].color} stroke={SURFACE} strokeWidth="2" />
                <text x={cx} y={cy - 9} textAnchor="middle" className="chart-symbol">
                  {STATUS[kind].symbol}
                </text>
              </g>
            );
          })}

          {/* Crosshair. */}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} className="chart-crosshair" />
          )}
        </svg>

        {hover !== null && hoverTiming && (
          <div
            className="chart-tooltip"
            style={{ left: `${(x(hover) / W) * 100}%` }}
            role="status"
          >
            <div className="tooltip-move">{moveName(hover)}</div>
            {(["w", "b"] as const).map((c) => {
              const r = readingAt(hover, c);
              return r ? (
                <div key={c} className="tooltip-row">
                  <svg width="12" height="6" aria-hidden="true">
                    <line x1="0" y1="3" x2="12" y2="3" stroke={SERIES[c].color} strokeWidth="2" />
                  </svg>
                  <strong>{formatClock(r.clockMs!)}</strong>
                  <span className="muted">{SERIES[c].name}</span>
                </div>
              ) : null;
            })}
            {hoverTiming.spentMs !== undefined && (
              <div className="muted">Took {formatDuration(hoverTiming.spentMs)}</div>
            )}
          </div>
        )}
      </div>
      <p className="muted chart-hint">Click the chart to jump to that move.</p>
    </figure>
  );
}
