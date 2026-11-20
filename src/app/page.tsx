import Link from "next/link";
import { Reveal } from "@/components/layout/Reveal";

/*
 * The landing page, in the style of the Chess Concept Showcase hero:
 * eyebrow line, outline + solid title, italic lede, gold and blue buttons,
 * then a row of feature cards. Every number on this page is a real fact
 * about the app (no made-up statistics).
 */

const FEATURES = [
  {
    symbol: "♔",
    mark: "Analyse",
    title: "See every position clearly",
    text: "Recreate a game by clicking or paste a PGN. Stockfish shows the evaluation and the best move for whatever is on the board.",
    tags: ["Eval bar", "Best move", "PGN import"],
    href: "/analyse",
    accent: "gold",
  },
  {
    symbol: "♕",
    mark: "Review",
    title: "Find where it turned",
    text: "A full-game review marks each move as good, inaccuracy, mistake or blunder, and takes you straight to your worst moments.",
    tags: ["?!  ?  ??", "Worst moves", "Better move"],
    href: "/analyse",
    accent: "gold",
  },
  {
    symbol: "♖",
    mark: "Play",
    title: "Play the bot, then learn from it",
    text: "Five levels, from Pawn to Queen. Play a full game with no engine help, then review it: every mistake on both sides is marked.",
    tags: ["5 levels", "Take back", "Review after"],
    href: "/play",
    accent: "gold",
  },
  {
    symbol: "♘",
    mark: "Explore",
    title: "Ask “what if?”",
    text: "Try a different move from any position. Your new idea becomes a variation, and the original game is kept.",
    tags: ["Variations", "Make main line"],
    href: "/analyse",
    accent: "arc",
  },
  {
    symbol: "♗",
    mark: "Openings",
    title: "Learn your openings",
    text: "The London System, the Caro-Kann and the King’s Gambit. Walk through the lines, explore freely, predict each move with hints, then practise against book replies.",
    tags: ["Learn", "Explore", "Predict", "Practice"],
    href: "/openings",
    accent: "arc",
  },
];

const FACTS = [
  { value: "19", label: "Stockfish version" },
  { value: "0", label: "Servers needed" },
  { value: "4", label: "Lesson modes" },
];

export default function Landing() {
  return (
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">Review&nbsp;&nbsp;•&nbsp;&nbsp;Predict&nbsp;&nbsp;•&nbsp;&nbsp;Practise</p>
        <h1 className="hero-title">
          <span className="title-outline">Know</span>
          <span className="title-solid">your game</span>
        </h1>
        <p className="hero-subtitle">Every loss has a turning point. Find yours.</p>
        <p className="lede">
          Replay the games you lost, let the engine show you where they turned, and build an opening repertoire
          one move at a time.
        </p>
        <div className="hero-ctas">
          <Link href="/analyse" className="btn-gold">
            Review a game
          </Link>
          <Link href="/openings" className="btn-arc">
            Study an opening
          </Link>
        </div>
        <dl className="facts">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt>{f.value}</dt>
              <dd>{f.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="features">
        <p className="section-tag section-tag-center">What you can do here</p>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            // Each card fades up as it scrolls into view, a little after the one before it.
            <Reveal key={f.mark} delayMs={i * 110}>
              <Link href={f.href} className={`feature-card accent-${f.accent}`}>
                <div className="feature-top">
                  <span className="feature-symbol" aria-hidden="true">
                    {f.symbol}
                  </span>
                  <span className="feature-mark">{f.mark}</span>
                </div>
                <h2>{f.title}</h2>
                <p>{f.text}</p>
                <div className="chips">
                  {f.tags.map((t) => (
                    <span key={t} className="move-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
