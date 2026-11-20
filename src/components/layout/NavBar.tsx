"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// In the order a beginner needs them: rules first, then playing, openings, and reviewing games.
const LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/play", label: "Play" },
  { href: "/openings", label: "Openings" },
  { href: "/analyse", label: "Analyse" },
];

/** The top bar on every page: logo, section links (current one in gold) and the main call to action. */
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="navbar" aria-label="Main">
      <Link href="/" className="logo">
        <span aria-hidden="true">♔</span>échecs Trainer
      </Link>
      <ul className="nav-links">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={pathname.startsWith(l.href) ? "nav-active" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/analyse" className="btn-gold btn-small">
        Review a game
      </Link>
    </nav>
  );
}
