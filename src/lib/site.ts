/**
 * Site settings that change per deployment. They come from environment
 * variables (set them in Vercel's project settings, or in .env.local when
 * running on your own computer). NEXT_PUBLIC_ variables are built into the
 * pages, so they must never hold secrets.
 */

/** The feedback form (a Google Form link). While it's empty, the "Send feedback" link is hidden. */
export const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() || null;

/** This app's own source code, if you choose to publish it. Shown on the About page when set. */
export const APP_SOURCE_URL = process.env.NEXT_PUBLIC_SOURCE_URL?.trim() || null;

/** The date the privacy note was last changed (update it whenever the note changes). */
export const PRIVACY_UPDATED = "20 November 2026";

/** The engine build the app ships, and where its source code is (GPL-3.0 requires offering it). */
export const ENGINE = {
  name: "Stockfish 19 (stockfish.js 19.0.1, lite single-threaded WebAssembly build)",
  sourceUrl: "https://github.com/nmrugg/stockfish.js",
  upstreamUrl: "https://github.com/official-stockfish/Stockfish",
  licenceFile: "/engine/COPYING.txt",
};
