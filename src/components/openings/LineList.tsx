"use client";

import type { OpeningLine } from "@/lib/openings/navigate";

interface Props {
  lines: OpeningLine[];
  selected: number;
  onSelect: (index: number) => void;
  title?: string;
}

/** The list of lines to choose from (used by Learn and Predict). */
export function LineList({ lines, selected, onSelect, title = "Lines" }: Props) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="line-list">
        {lines.map((l, i) => (
          <li key={l.ids.join(" ")}>
            <button className={i === selected ? "line-active" : ""} onClick={() => onSelect(i)}>
              <span>{l.name}</span>
              <span className="muted">{l.ids.length} moves</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
