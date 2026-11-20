"use client";

import { useMemo, useState } from "react";
import { openingById } from "@/data/openings";
import { buildOpening } from "@/lib/openings/build";
import { LearnMode } from "./LearnMode";
import { ExploreMode } from "./ExploreMode";
import { PredictMode } from "./PredictMode";
import { PracticeMode } from "./PracticeMode";

type Mode = "learn" | "explore" | "predict" | "practice";

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "learn", label: "Learn", blurb: "Step through a line with an explanation for every move." },
  { id: "explore", label: "Explore", blurb: "Play any moves. See the known replies, and find out when you leave the book." },
  { id: "predict", label: "Predict", blurb: "Guess each move before it is shown, with hints in steps." },
  { id: "practice", label: "Practice", blurb: "Play your side; the app answers from the book." },
];

/**
 * One opening lesson with its four modes. Every opening uses this same page:
 * the lesson's data (and its `playAs` side) is all that changes.
 */
export function OpeningLesson({ id }: { id: string }) {
  // Built when the page loads: chess.js checks every move as it builds.
  const opening = useMemo(() => buildOpening(openingById(id)!), [id]);
  const [mode, setMode] = useState<Mode>("learn");

  // "Caro-Kann Defence" -> outlined "Caro-Kann", solid "Defence".
  const words = opening.name.split(" ");
  const solid = words.pop();

  return (
    <div className="opening-page">
      <header className="opening-header">
        <div>
          <p className="section-tag">
            Opening lesson · {opening.moveOrder} · you play {opening.playAs === "w" ? "White" : "Black"}
          </p>
          <h1 className="page-title">
            {words.length > 0 && <span className="title-outline">{words.join(" ")}</span>} <span className="title-solid">{solid}</span>
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
