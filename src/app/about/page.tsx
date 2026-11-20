import Link from "next/link";
import { APP_SOURCE_URL, ENGINE, FEEDBACK_URL } from "@/lib/site";

export const metadata = { title: "About · Chess Trainer" };

/** Open-source software the app is built on, with each licence. */
const CREDITS = [
  { name: "Stockfish", what: "the chess engine (via stockfish.js)", licence: "GNU GPL v3", url: ENGINE.upstreamUrl },
  { name: "chess.js", what: "the rules of chess: legal moves, check, PGN", licence: "BSD 2-Clause, © 2025 Jeff Hlywa", url: "https://github.com/jhlywa/chess.js" },
  { name: "react-chessboard", what: "the board", licence: "MIT", url: "https://github.com/Clariity/react-chessboard" },
  { name: "Next.js and React", what: "the web framework", licence: "MIT", url: "https://nextjs.org" },
  { name: "Cinzel, Space Mono, EB Garamond, Space Grotesk", what: "the fonts", licence: "SIL Open Font License", url: "https://fonts.google.com" },
];

export default function AboutPage() {
  return (
    <main className="text-page">
      <p className="section-tag">About</p>
      <h1 className="page-title">
        <span className="title-outline">About</span> <span className="title-solid">Chess Trainer</span>
      </h1>

      <p className="lede">
        A place to learn chess and get better at it: learn the rules, play a bot that explains its moves, study openings,
        and review your games to see where they turned.
      </p>

      <section>
        <h2>How it works</h2>
        <p>
          Everything runs in your own browser, including the chess engine. There are no accounts and nothing to install,
          and once a page has loaded the engine keeps working even on a weak connection.
        </p>
        <p>
          This is an early version, being tried out with a small group of players. {FEEDBACK_URL ? (
            <>
              If something is confusing or broken, please <a href={FEEDBACK_URL}>send feedback</a>.
            </>
          ) : (
            "Your feedback shapes what comes next."
          )}
        </p>
      </section>

      <section>
        <h2>The chess engine and its licence</h2>
        <p>
          The engine is {ENGINE.name}. Stockfish is free software, released under the GNU General Public License, version 3.
          You may use, study, share and change it under that licence. The engine files this site sends to your browser are
          unchanged copies of that build.
        </p>
        <ul>
          <li>
            <a href={ENGINE.licenceFile}>The full licence text (GPL v3)</a>
          </li>
          <li>
            <a href={ENGINE.sourceUrl}>Source code of the browser build (stockfish.js)</a>
          </li>
          <li>
            <a href={ENGINE.upstreamUrl}>Source code of Stockfish itself</a>
          </li>
          {APP_SOURCE_URL && (
            <li>
              <a href={APP_SOURCE_URL}>Source code of this app</a>
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2>Built with</h2>
        <ul className="credits">
          {CREDITS.map((c) => (
            <li key={c.name}>
              <a href={c.url}>{c.name}</a>: {c.what}. <span className="muted">{c.licence}.</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>More</h2>
        <ul>
          <li>
            <Link href="/privacy">Privacy: what this app stores (very little)</Link>
          </li>
          <li>
            <Link href="/engine-spike">Engine test page</Link> <span className="muted">(for checking the engine works on a device)</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
