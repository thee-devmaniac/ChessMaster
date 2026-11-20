/**
 * Passing a finished game from the Play page to the Analyse page.
 *
 * The game is kept in sessionStorage (this browser tab only) for the moment
 * it takes to change page; the Analyse page reads it once and removes it.
 * Browser storage can be unavailable (some private modes), so every access
 * is wrapped: if it fails, the hand-off simply doesn't happen.
 */
const KEY = "chess-trainer:review-game";

export function queueGameForReview(pgn: string): boolean {
  try {
    sessionStorage.setItem(KEY, pgn);
    return true;
  } catch {
    return false;
  }
}

/** Returns the queued game's PGN, once (it is removed as it is read), or null. */
export function takeQueuedGame(): string | null {
  try {
    const pgn = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return pgn;
  } catch {
    return null;
  }
}
