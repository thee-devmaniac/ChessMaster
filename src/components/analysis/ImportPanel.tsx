"use client";

import { useState } from "react";
import { checkFen } from "@/lib/chess/fen";
import { importPgn, type ImportedGame } from "@/lib/chess/rules";
import { MAX_PGN_BYTES, describeTimeControl, summarisePgn, type PgnSummary } from "@/lib/chess/pgnFile";

interface Props {
  onLoadGame: (game: ImportedGame) => void;
  onLoadFen: (fen: string) => void;
}

type Message = { ok: boolean; text: string } | null;

/** chess.js parser errors list every token it expected; a learner only needs the gist. */
function friendlyError(error: string): string {
  const found = error.match(/but "(.*)" found/);
  if (error.startsWith("Expected")) return found ? `unexpected "${found[1]}" in the moves` : "the moves couldn't be read";
  return error;
}

/** "won by checkmate" from "Nyoike-7 won by checkmate": the player's name is already in the row. */
function shortTermination(s: PgnSummary): string | undefined {
  const t = s.termination;
  if (!t) return undefined;
  for (const name of [s.white, s.black]) if (t.startsWith(name + " ")) return t.slice(name.length + 1);
  return t;
}

/**
 * Import: paste or upload PGN (one game or many) or a FEN position.
 * Several games -> a list to choose from; each game is read only when chosen,
 * so a file with hundreds of games opens instantly, and one broken game
 * doesn't stop the others from loading.
 */
export function ImportPanel({ onLoadGame, onLoadFen }: Props) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [games, setGames] = useState<PgnSummary[]>([]);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("");
  const [dragging, setDragging] = useState(false);
  // The panel stays open or closed as the user left it (it opens itself when a list of games appears).
  const [open, setOpen] = useState(false);

  function pick(list: PgnSummary[], i: number) {
    const result = importPgn(list[i].pgn);
    if (!result.ok) {
      const why = friendlyError(result.error);
      setErrors((e) => ({ ...e, [i]: why }));
      setMessage({ ok: false, text: `Game ${i + 1} couldn't be read (${why}). The other games still work.` });
      return;
    }
    onLoadGame(result.game);
    setLoaded(i);
    const g = list[i];
    setMessage({ ok: true, text: `Loaded ${g.white} vs ${g.black} (${g.result}). Click "Review game" to analyse it.` });
  }

  /** Reads PGN text: one game loads straight away, several are listed. */
  function loadPgnText(pgnText: string, source: string) {
    const list = summarisePgn(pgnText);
    setErrors({});
    setLoaded(null);
    setFilter("");
    if (list.length === 0) {
      setGames([]);
      setMessage({ ok: false, text: "No games found. Paste a PGN, or choose a .pgn file." });
      return;
    }
    setGames(list.length > 1 ? list : []);
    if (list.length === 1) pick(list, 0);
    else {
      setOpen(true);
      setMessage({ ok: true, text: `${list.length} games found in ${source}. Choose one to review.` });
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_PGN_BYTES) {
      setMessage({ ok: false, text: `${file.name} is too large (the limit is ${MAX_PGN_BYTES / 1024 / 1024} MB).` });
      return;
    }
    loadPgnText(await file.text(), file.name);
  }

  function loadFen() {
    const result = checkFen(text);
    if (result.ok) {
      onLoadFen(result.fen);
      setMessage({ ok: true, text: "Position loaded." });
    } else {
      setMessage({ ok: false, text: `Invalid FEN: ${result.error}` });
    }
  }

  const needle = filter.trim().toLowerCase();
  const shown = needle ? games.filter((g) => `${g.white} ${g.black}`.toLowerCase().includes(needle)) : games;

  return (
    <details className="import" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Import games (PGN) or a position (FEN)</summary>

      <div
        className={`drop-zone ${dragging ? "drop-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          loadFile(e.dataTransfer.files[0]);
        }}
      >
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Paste one or more games from Chess.com or Lichess,\nor drop a .pgn file here.\n\nOr paste a FEN position."
          }
          spellCheck={false}
        />
      </div>

      <div className="buttons">
        <button onClick={() => loadPgnText(text, "the pasted text")}>Load PGN</button>
        <label className="file-button">
          Open .pgn file
          <input
            type="file"
            accept=".pgn,.txt,application/x-chess-pgn,text/plain"
            onChange={(e) => {
              loadFile(e.target.files?.[0]);
              e.target.value = ""; // so choosing the same file again still triggers a load
            }}
          />
        </label>
        <button onClick={loadFen}>Load FEN</button>
      </div>

      {message && (
        <p className={message.ok ? "muted" : "error"} role="status">
          {message.text}
        </p>
      )}

      {games.length > 1 && (
        <div className="game-picker">
          {games.length > 8 && (
            <input
              type="search"
              className="game-filter"
              placeholder="Filter by player name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
          <ul className="game-list">
            {shown.map((g) => {
              const details = [
                describeTimeControl(g.timeControl),
                `${g.moves} move${g.moves === 1 ? "" : "s"}`,
                g.date?.replace(/\./g, "-"),
                shortTermination(g),
              ].filter(Boolean);
              return (
                <li key={g.index}>
                  <button
                    className={g.index === loaded ? "line-active" : undefined}
                    onClick={() => pick(games, g.index)}
                    aria-current={g.index === loaded ? "true" : undefined}
                  >
                    <span className="game-players">
                      {g.white} <span className="muted">vs</span> {g.black}
                      <span className="chip">{g.result}</span>
                    </span>
                    <span className="muted">{details.join(" · ")}</span>
                    {errors[g.index] && <span className="error">Couldn&apos;t read this game: {errors[g.index]}</span>}
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="muted">No games with that player.</li>}
          </ul>
        </div>
      )}
    </details>
  );
}
