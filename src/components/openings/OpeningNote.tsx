"use client";

import type { OpeningNode } from "@/lib/openings/types";
import { moveLabel } from "@/lib/openings/navigate";

/** Colour class for a verdict: ivory for White, slate for Black, gold for balanced or unclear. */
function verdictClass(verdict: string): string {
  if (verdict.includes("White")) return "verdict-white";
  if (verdict.includes("Black")) return "verdict-black";
  return "verdict-even";
}

/** The explanation card for one position in an opening. */
export function OpeningNote({ node, intro }: { node: OpeningNode; intro?: string }) {
  if (!node.san) {
    return (
      <section className="card">
        <h2>Starting position</h2>
        <p>{intro ?? node.explanation}</p>
      </section>
    );
  }
  return (
    <section className="card opening-note">
      <div className="card-header">
        <h2>
          {moveLabel(node)}
          {node.name && <span className="line-name"> · {node.name}</span>}
        </h2>
      </div>
      {(node.verdict || node.tags.length > 0) && (
        <div className="chips">
          {node.verdict && <span className={`chip ${verdictClass(node.verdict)}`}>{node.verdict}</span>}
          {node.tags.map((t) => (
            <span key={t} className={`chip tag-${t.replace(/\s+/g, "-")}`}>
              {t}
            </span>
          ))}
        </div>
      )}
      <p>{node.explanation}</p>
    </section>
  );
}
