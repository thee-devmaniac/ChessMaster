import Link from "next/link";
import { OPENINGS } from "@/data/openings";

export const metadata = { title: "Openings · Chess Trainer" };

/** The list of opening lessons, grouped by the side you play. */
export default function OpeningsPage() {
  const groups = [
    { side: "w", title: "As White" },
    { side: "b", title: "As Black" },
  ] as const;

  return (
    <div className="opening-page">
      <header className="opening-header">
        <div>
          <p className="section-tag">Opening lessons</p>
          <h1 className="page-title">
            <span className="title-outline">Choose an</span> <span className="title-solid">Opening</span>
          </h1>
          <p className="lede">
            Each lesson has four modes: learn the lines, explore freely, predict the moves, then practise against the
            book.
          </p>
        </div>
      </header>

      {groups.map((g) => (
        <section key={g.side} className="opening-group">
          <h2 className="section-tag">{g.title}</h2>
          <ul className="opening-cards">
            {OPENINGS.filter((o) => o.playAs === g.side).map((o) => (
              <li key={o.id}>
                <Link href={`/openings/${o.id}`} className="card opening-card">
                  <span className="opening-moves">{o.moveOrder}</span>
                  <strong>{o.name}</strong>
                  <span className="muted">{o.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
