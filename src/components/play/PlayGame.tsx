"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChessBoard } from "@/components/board/ChessBoard";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { useStockfish } from "@/hooks/useStockfish";
import { BOT_LEVELS, chooseBotMove, levelById, scoreFor, type BotLevel, type Candidate } from "@/lib/bot/levels";
import { canTakeBack, fenOfGame, resultOf, takeBack, toPgn, type BotGame } from "@/lib/bot/game";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { STARTING_FEN } from "@/lib/chess/fen";
import { queueGameForReview } from "@/lib/chess/handoff";
import { checkedKingSquare, makeMove, turn, type MoveInput, type PromotionPiece } from "@/lib/chess/rules";
import { ROOT, continuation, treeFromMoves } from "@/lib/chess/tree";
import { AnalysisCancelledError } from "@/lib/engine/StockfishEngine";
import type { Color } from "@/lib/engine/types";

/** The bot waits at least this long, so its move doesn't appear the instant you let go of yours. */
const BOT_MIN_DELAY_MS = 500;

/** The bot accepts a draw offer when it thinks it is at least this far behind (centipawns)... */
const DRAW_ACCEPT_WHEN_LOSING_CP = -150;
/** ...or late in a game that is level (after this many half-moves, within this margin). */
const DRAW_ACCEPT_LATE_PLY = 60;
const DRAW_ACCEPT_LEVEL_CP = 30;

const NAME: Record<Color, string> = { w: "White", b: "Black" };

/**
 * Play a full game against the bot. There is deliberately no engine help
 * while you play (no evaluation bar, no best-move arrow): the game is real
 * practice. Afterwards, "Review this game" opens it on the Analyse page.
 */
export function PlayGame() {
  const router = useRouter();
  const { engine, error: engineError } = useStockfish();

  // Setup choices.
  const [levelId, setLevelId] = useState<BotLevel["id"]>("pawn");
  const [colorChoice, setColorChoice] = useState<Color | "random">("w");

  // The game: null while choosing the settings.
  const [game, setGame] = useState<BotGame | null>(null);
  const [click, setClick] = useState<ClickState>(IDLE);
  // The bot's opinion of the position after its last move, from its own side (used for draw offers).
  const [botView, setBotView] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);

  const level = levelById(levelId);
  const player = game?.player;
  const fen = game ? fenOfGame(game) : STARTING_FEN;
  const result = game ? resultOf(game) : null;
  const playing = result?.kind === "playing";
  const botToMove = playing && turn(fen) !== player;
  const yourMove = playing && turn(fen) === player;

  // ---- The bot's turn: ask the engine for its top moves, then pick one for this level ----
  useEffect(() => {
    if (!engine || !botToMove || !player) return;
    let active = true;
    const started = Date.now();
    const bot: Color = player === "w" ? "b" : "w";
    engine
      .analyse(fen, { depth: level.depth }, undefined, { multiPv: level.multiPv })
      .then(async (a) => {
        const lines = a.lines ?? [{ score: a.score, pv: a.pv }];
        const candidates: Candidate[] = lines.filter((l) => l.pv.length > 0).map((l) => ({ uci: l.pv[0], score: l.score }));
        if (candidates.length === 0 && a.bestMove) candidates.push({ uci: a.bestMove, score: a.score });
        if (candidates.length === 0) return; // no legal moves: the game is already over
        const uci = chooseBotMove(candidates, bot, level);
        await new Promise((r) => setTimeout(r, Math.max(0, BOT_MIN_DELAY_MS - (Date.now() - started))));
        if (!active) return;
        const move = makeMove(fen, { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as PromotionPiece | undefined });
        if (!move) return;
        setBotView(scoreFor(a.score, bot));
        // Only add the move if the game hasn't changed meanwhile (a take-back or a new game).
        setGame((g) => (g && fenOfGame(g) === fen ? { ...g, moves: [...g.moves, move] } : g));
      })
      .catch((e) => {
        if (!(e instanceof AnalysisCancelledError) && active) setNotice(`The bot had a problem: ${String(e)}`);
      });
    return () => {
      active = false;
      engine.cancel();
    };
  }, [engine, botToMove, fen, player, level]);

  // ---- Your moves ----
  function play(move?: MoveInput) {
    if (!move || !game) return;
    const played = makeMove(fen, move);
    if (!played) return;
    setNotice(null);
    setConfirmResign(false);
    setGame({ ...game, moves: [...game.moves, played] });
  }

  function handleSquareClick(square: string) {
    if (!yourMove) return;
    const r = clickSquare(fen, click, square);
    setClick(r.state);
    play(r.move);
  }

  function handlePromotion(piece: PromotionPiece) {
    const r = choosePromotion(click, piece);
    setClick(r.state);
    play(r.move);
  }

  // ---- Game controls ----
  function start() {
    const side: Color = colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    setGame({ startFen: STARTING_FEN, moves: [], player: side });
    setClick(IDLE);
    setBotView(null);
    setNotice(null);
    setConfirmResign(false);
  }

  function newGame() {
    engine?.cancel();
    setGame(null);
    setClick(IDLE);
    setNotice(null);
  }

  function handleTakeBack() {
    if (!game) return;
    engine?.cancel();
    setGame(takeBack(game));
    setClick(IDLE);
    setNotice(null);
  }

  function offerDraw() {
    if (!game) return;
    const accepts =
      botView !== null &&
      (botView <= DRAW_ACCEPT_WHEN_LOSING_CP || (game.moves.length >= DRAW_ACCEPT_LATE_PLY && Math.abs(botView) <= DRAW_ACCEPT_LEVEL_CP));
    if (accepts) setGame({ ...game, ended: { kind: "draw agreed" } });
    else setNotice("The bot says no thanks: it thinks its position is fine. Play on!");
  }

  function resign() {
    if (!game) return;
    if (!confirmResign) return setConfirmResign(true);
    setGame({ ...game, ended: { kind: "resigned" } });
    setConfirmResign(false);
  }

  const names = { player: "You", bot: `Bot (${level.name})` };

  function reviewGame() {
    if (!game) return;
    if (queueGameForReview(toPgn(game, names))) router.push("/analyse");
    else setNotice("This browser blocked passing the game on. Download the PGN and load it on the Analyse page instead.");
  }

  function downloadPgn() {
    if (!game) return;
    const url = URL.createObjectURL(new Blob([toPgn(game, names)], { type: "application/x-chess-pgn" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-trainer-vs-${level.id}-${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Display ----
  const tree = useMemo(() => treeFromMoves(game?.startFen ?? STARTING_FEN, game?.moves ?? []), [game]);
  const current = continuation(tree, ROOT).at(-1) ?? ROOT;
  const lastMove = game?.moves.at(-1);
  const squareStyles = buildSquareStyles({ click, lastMove, checkSquare: checkedKingSquare(fen) });
  const orientation = (player ?? (colorChoice === "b" ? "b" : "w")) === "w" ? "white" : "black";
  const inCheck = playing && checkedKingSquare(fen) !== null;

  return (
    <main className="layout">
      <section className="board board-wrap">
        <ChessBoard fen={fen} orientation={orientation} onSquareClick={handleSquareClick} squareStyles={squareStyles} />
        {click.kind === "choosingPromotion" && (
          <PromotionPicker color={turn(fen)} onChoose={handlePromotion} onCancel={() => setClick(IDLE)} />
        )}
      </section>

      <aside className="panel">
        <div>
          <p className="section-tag">Practice game</p>
          <h1 className="page-title">
            <span className="title-outline">Play</span> <span className="title-solid">the bot</span>
          </h1>
        </div>

        {engineError && <p className="error">The engine couldn&apos;t load: {engineError}</p>}

        {!game ? (
          <>
            <section className="card">
              <h2>Choose your opponent</h2>
              <div className="level-list" role="radiogroup" aria-label="Bot level">
                {BOT_LEVELS.map((l) => (
                  <button
                    key={l.id}
                    role="radio"
                    aria-checked={l.id === levelId}
                    className={`level-option ${l.id === levelId ? "level-active" : ""}`}
                    onClick={() => setLevelId(l.id)}
                  >
                    <span className="level-symbol" aria-hidden="true">
                      {l.symbol}
                    </span>
                    <span>
                      <strong>{l.name}</strong>
                      <span className="muted">{l.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="card">
              <h2>Your colour</h2>
              <div className="buttons" role="radiogroup" aria-label="Your colour">
                {(["w", "b", "random"] as const).map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={colorChoice === c}
                    className={colorChoice === c ? "tab tab-active" : "tab"}
                    onClick={() => setColorChoice(c)}
                  >
                    {c === "random" ? "Random" : NAME[c]}
                  </button>
                ))}
              </div>
              <div className="buttons">
                <button className="btn-start" onClick={start} disabled={!engine}>
                  {engine ? "Start game" : "Loading the engine…"}
                </button>
              </div>
              <p className="muted">No engine help during the game: it&apos;s real practice. Review it afterwards.</p>
            </section>
          </>
        ) : (
          <>
            <p className={`status ${playing ? "" : "status-over"}`} role="status">
              {playing
                ? yourMove
                  ? `Your move (${NAME[player!]})${inCheck ? ": you're in check!" : ""}`
                  : `${names.bot} is thinking…`
                : result!.kind === "win"
                  ? `You won by ${result!.reason}!`
                  : result!.kind === "loss"
                    ? `${names.bot} won: ${result!.reason}.`
                    : `Draw: ${result!.reason}.`}
            </p>

            <p className="muted">
              You ({NAME[player!]}) vs {names.bot}
            </p>

            <MoveList tree={tree} current={current} onSelect={() => {}} />

            {notice && <p className="hint">{notice}</p>}

            {playing ? (
              <div className="buttons">
                <button onClick={handleTakeBack} disabled={!canTakeBack(game)}>
                  Take back
                </button>
                <button onClick={offerDraw} disabled={!yourMove || game.moves.length < 2}>
                  Offer a draw
                </button>
                <button onClick={resign} className={confirmResign ? "btn-danger" : undefined}>
                  {confirmResign ? "Yes, resign" : "Resign"}
                </button>
                {confirmResign && <button onClick={() => setConfirmResign(false)}>Keep playing</button>}
              </div>
            ) : (
              <section className={`card ${result!.kind === "win" ? "verdict-good" : ""}`}>
                <h2>{result!.kind === "win" ? "Well played!" : result!.kind === "draw" ? "A draw" : "Game over"}</h2>
                <p>
                  Now the important part: look back at the game. The review marks the mistakes on both sides and shows what
                  was better.
                </p>
                <div className="buttons">
                  <button className="btn-start" onClick={reviewGame}>
                    Review this game
                  </button>
                  <button onClick={downloadPgn}>Download PGN</button>
                  <button onClick={newGame}>New game</button>
                </div>
              </section>
            )}

            {playing && (
              <div className="buttons">
                <button onClick={newGame}>Quit to setup</button>
              </div>
            )}
          </>
        )}
      </aside>
    </main>
  );
}
