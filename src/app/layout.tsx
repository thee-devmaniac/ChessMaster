import type { Metadata } from "next";
import { Cinzel, EB_Garamond, Space_Grotesk, Space_Mono } from "next/font/google";
import Link from "next/link";
import { NavBar } from "@/components/layout/NavBar";
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
  title: "Chess Trainer: review your games, learn your openings",
  description: "Review your games with Stockfish, find your blunders, and learn openings move by move.",
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
          <Link href="/engine-spike">Engine test page</Link>
        </footer>
      </body>
    </html>
  );
}
