"use client";

import { useState } from "react";
import { kingsGambit } from "@/data/openings/kingsGambit";
import { buildOpening } from "@/lib/openings/build";
import { LearnMode } from "@/components/openings/LearnMode";
import { ExploreMode } from "@/components/openings/ExploreMode";
import { PredictMode } from "@/components/openings/PredictMode";
import { PracticeMode } from "@/components/openings/PracticeMode";

// Built once when the page loads. chess.js checks every move as it builds.
const opening = buildOpening(kingsGambit);

type Mode = "learn" | "explore" | "predict" | "practice";

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "learn", label: "Learn", blurb: "Step through a line with an explanation for every move." },
  { id: "explore", label: "Explore", blurb: "Play any moves. See the known replies, and find out when you leave the book." },
  { id: "predict", label: "Predict", blurb: "Guess each move before it is shown, with hints in steps." },
  { id: "practice", label: "Practice", blurb: "Play one side; the app answers from the book." },
];

export default function KingsGambitPage() {
  const [mode, setMode] = useState<Mode>("learn");

  return (
    <div className="opening-page">
      <header className="opening-header">
        <div>
          <p className="section-tag">Opening lesson · 1. e4 e5 2. f4</p>
          <h1 className="page-title">
            <span className="title-outline">King&apos;s</span> <span className="title-solid">Gambit</span>
          </h1>
          <p className="lede">{opening.intro}</p>
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
      {mode === "learn" && <LearnMode key="learn" opening={opening} />}
      {mode === "explore" && <ExploreMode key="explore" opening={opening} />}
      {mode === "predict" && <PredictMode key="predict" opening={opening} />}
      {mode === "practice" && <PracticeMode key="practice" opening={opening} />}

      <p className="muted source">{opening.source}</p>
    </div>
  );
}
