"use client";

import { SYMBOL } from "@/lib/review/classify";
import { needsDecision, type BotNote, type VerdictState } from "./useCoach";

interface Props {
  verdict: VerdictState | null;
  botNote: BotNote | null;
  /** The coach is holding the bot back until you decide what to do about a mistake. */
  waitingForYou: boolean;
  showBetter: boolean;
  onTryAgain: () => void;
  onShowBetter: () => void;
  onPlayOn: () => void;
}

/**
 * What the coach says: the verdict on your last move (with "Try again" after
 * a mistake) and an explanation of the bot's last move, including what it
 * threatens. The order follows the game: your move first, then the reply.
 */
export function CoachPanel({ verdict, botNote, waitingForYou, showBetter, onTryAgain, onShowBetter, onPlayOn }: Props) {
  if (!verdict && !botNote) {
    return (
      <section className="card coach">
        <h2>Coach</h2>
        <p className="muted">Make a move: the coach will tell you how it was, and explain every move the bot makes.</p>
      </section>
    );
  }

  const v = verdict?.status === "done" ? verdict.v : null;
  const tone = v ? `coach-${v.classification}` : "";

  return (
    <section className="card coach" aria-live="polite">
      <h2>Coach</h2>

      {verdict && (
        <div className={`coach-verdict ${tone}`}>
          <p>
            <strong>
              You played {verdict.label}
              {v && SYMBOL[v.classification]}
            </strong>
            {verdict.status === "checking" ? <span className="muted"> · checking…</span> : null}
          </p>
          {v && <p>{v.message}</p>}
          {v && showBetter && v.bestSan && (
            <p>
              Better was <strong>{v.bestSan}</strong>. Press &quot;Try again&quot; and the gold arrow will show it.
            </p>
          )}
          {v && waitingForYou && needsDecision(v) && (
            <div className="buttons">
              <button className="btn-start" onClick={onTryAgain}>
                Try again
              </button>
              {!showBetter && v.bestSan && <button onClick={onShowBetter}>Show a better move</button>}
              <button onClick={onPlayOn}>Play on</button>
            </div>
          )}
        </div>
      )}

      {botNote && (
        <div className="coach-bot">
          <p>
            <strong>The bot played {botNote.label}</strong>
          </p>
          {botNote.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          {botNote.slipped && <p className="coach-chance">The bot may have slipped! Look for a capture or a check.</p>}
          {botNote.threat && <p className="coach-threat">Watch out: it threatens {botNote.threat}.</p>}
          {botNote.status === "checking" && <p className="muted">Looking for threats…</p>}
        </div>
      )}
    </section>
  );
}
