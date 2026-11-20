import type { Metadata } from "next";
import { Cinzel, EB_Garamond, Space_Grotesk, Space_Mono } from "next/font/google";
import Link from "next/link";
import { NavBar } from "@/components/layout/NavBar";
import { FEEDBACK_URL } from "@/lib/site";
import "./globals.css";

/*
 * Fonts, each with one job (the same roles as the Chess Concept Showcase):
 *   Cinzel        – display titles, the logo
 *   Space Mono    – small uppercase labels, moves, numbers
 *   EB Garamond   – body text and explanations
 *   Space Grotesk – interface text: buttons, inputs, tables
 * next/font downloads them at build time and serves them from our own site,
 * so visitors' browsers never contact Google. Each one becomes a CSS variable.
 */
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-display" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });
const garamond = EB_Garamond({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Chess Trainer: learn chess, play, and review your games",
  description:
    "Learn the rules step by step, play a bot that explains its moves, study openings, and review your games with Stockfish. Free, in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cinzel.variable} ${spaceMono.variable} ${garamond.variable} ${grotesk.variable}`}>
      <body>
        <div className="board-texture" aria-hidden="true" />
        <NavBar />
        <div className="page">{children}</div>
        <footer className="site-footer">
          <span>Analysis by Stockfish 19 (GPL), running in your browser.</span>
          <nav className="footer-links" aria-label="Site">
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy</Link>
            {FEEDBACK_URL && <a href={FEEDBACK_URL}>Send feedback</a>}
          </nav>
        </footer>
      </body>
    </html>
  );
}
