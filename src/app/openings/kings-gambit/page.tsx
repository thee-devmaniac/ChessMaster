"use client";

import { useState } from "react";
import Link from "next/link";
import { kingsGambit } from "@/data/openings/kingsGambit";
import { buildOpening } from "@/lib/openings/build";
import { LearnMode } from "@/components/openings/LearnMode";
import { ExploreMode } from "@/components/openings/ExploreMode";

// Built once when the page loads. chess.js checks every move as it builds.
const opening = buildOpening(kingsGambit);

type Mode = "learn" | "explore";

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "learn", label: "Learn", blurb: "Step through a line with an explanation for every move." },
  { id: "explore", label: "Explore", blurb: "Play any moves. See the known replies, and find out when you leave the book." },
];

export default function KingsGambitPage() {
  const [mode, setMode] = useState<Mode>("learn");

  return (
    <div className="opening-page">
      <header className="opening-header">
        <div>
          <Link href="/">← Back to the board</Link>
          <h1>{opening.name}</h1>
          <p className="muted">{opening.intro}</p>
        </div>
        <nav className="tabs" aria-label="Lesson mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? "tab tab-active" : "tab"}
              onClick={() => setMode(m.id)}
              title={m.blurb}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      {/* key={mode} gives each mode a fresh start when you switch. */}
      {mode === "learn" ? <LearnMode key="learn" opening={opening} /> : <ExploreMode key="explore" opening={opening} />}

      <p className="muted source">{opening.source}</p>
    </div>
  );
}
