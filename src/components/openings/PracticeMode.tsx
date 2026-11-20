"use client";

import { useEffect, useReducer, useState } from "react";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { describeStatus } from "@/lib/chess/describe";
import { currentFen, currentStatus, newSession, sessionReducer } from "@/lib/chess/game";
import { checkedKingSquare, turn, type MoveInput, type PromotionPiece } from "@/lib/chess/rules";
import { moveNumberOf, pathTo } from "@/lib/chess/tree";
import { firstSentence, moveLabel, toMoveInput } from "@/lib/openings/navigate";
import { pickReply, practiceState } from "@/lib/openings/practice";
import type { Opening } from "@/lib/openings/types";
import { OpeningNote } from "./OpeningNote";

/** How long the app waits before answering, so you can see its move arrive. */
const REPLY_DELAY_MS = 600;

/**
 * Practice: you play one side, the app answers from the book. It usually
 * plays the main line but sometimes picks a side line or a trap, so you meet
 * those too. Leaving the book stops the practice and shows what was expected.
 */
export function PracticeMode({ opening }: { opening: Opening }) {
  const [side, setSide] = useState<"w" | "b">(opening.playAs);
  const [mainOnly, setMainOnly] = useState(false);
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => newSession());
  const [click, setClick] = useState<ClickState>(IDLE);
  const [showHint, setShowHint] = useState(false);

  const { tree, current } = session;
  const fen = currentFen(session);
  const status = currentStatus(session);
  const path = pathTo(tree, current);
  const sans = path.map((id) => tree.nodes[id].move!.san);
  const state = practiceState(opening, sans, side);

  // The app's turn: pick a book reply and play it after a short pause.
  useEffect(() => {
    if (state.kind !== "app-move") return;
    const timer = setTimeout(() => {
      const reply = pickReply(opening, state.node, { mainOnly });
      if (reply) dispatch({ type: "play", move: toMoveInput(reply) });
    }, REPLY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [opening, state.kind, state.node, mainOnly]);

  function play(move?: MoveInput) {
    if (!move) return;
    setShowHint(false);
    dispatch({ type: "play", move });
  }

  function handleSquareClick(square: string) {
    if (state.kind !== "your-move" || status.kind !== "playing") return;
    const r = clickSquare(fen, click, square);
    setClick(r.state);
    play(r.move);
  }

  function handlePromotion(piece: PromotionPiece) {
    const r = choosePromotion(click, piece);
    setClick(r.state);
    play(r.move);
  }

  function restart(newSide = side) {
    setSide(newSide);
    setClick(IDLE);
    setShowHint(false);
    dispatch({ type: "new", startFen: tree.startFen });
  }

  const squareStyles = buildSquareStyles({ click, lastMove: tree.nodes[current].move, checkSquare: checkedKingSquare(fen) });
  const bookMoves = state.node.children.map((id) => opening.nodes[id]);
  // How many of the player's moves were book moves (everything before leaving the book).
  const inBook = path.slice(0, state.kind === "off-book" ? state.at : path.length);
  const yourMovesInBook = inBook.filter((id) => moveNumberOf(tree, id).color === side).length;
  // The move that left the book, e.g. "2... d6".
  let leftWith = "";
  if (state.kind === "off-book") {
    const { number, color } = moveNumberOf(tree, path[state.at]);
    leftWith = `${number}${color === "w" ? "." : "..."} ${sans[state.at]}`;
  }

  return (
    <div className="layout">
      <section className="board board-wrap">
        <ChessBoard
          fen={fen}
          orientation={side === "w" ? "white" : "black"}
          onSquareClick={handleSquareClick}
          squareStyles={squareStyles}
        />
        {click.kind === "choosingPromotion" && (
          <PromotionPicker color={turn(fen)} onChoose={handlePromotion} onCancel={() => setClick(IDLE)} />
        )}
      </section>

      <aside className="panel">
        <div className="card">
          <h2>Practice</h2>
          <div className="buttons">
            <label className="muted">
              You play{" "}
              <select value={side} onChange={(e) => restart(e.target.value as "w" | "b")}>
                <option value="w">White</option>
                <option value="b">Black</option>
              </select>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={mainOnly} onChange={(e) => setMainOnly(e.target.checked)} />
              Main lines only
            </label>
            <button onClick={() => restart()}>Start again</button>
          </div>
          <p className="muted">
            {yourMovesInBook} of your moves in the book so far · {sans.join(" ") || "no moves yet"}
          </p>
        </div>

        {state.kind === "your-move" && status.kind === "playing" && (
          <section className="card quiz">
            <h2>Your move</h2>
            {showHint ? (
              <p>
                The book knows {bookMoves.length === 1 ? "one move" : `${bookMoves.length} moves`} here:{" "}
                <strong>{bookMoves.map((m) => m.san).join(", ")}</strong>.
              </p>
            ) : (
              <div className="buttons">
                <button onClick={() => setShowHint(true)}>Hint: show the book moves</button>
              </div>
            )}
          </section>
        )}

        {state.kind === "app-move" && <p className="muted">The app is choosing its reply…</p>}

        {state.kind === "off-book" && (
          <section className="card off-book">
            <h2>You left the book</h2>
            <p>
              <strong>{leftWith}</strong>{" "}
              isn&apos;t part of this lesson. The book expected{" "}
              <strong>
                {bookMoves.length > 1
                  ? `${bookMoves.slice(0, -1).map((m) => moveLabel(m)).join(", ")} or ${moveLabel(bookMoves.at(-1)!)}`
                  : moveLabel(bookMoves[0])}
              </strong>
              .
            </p>
            {bookMoves.length > 0 && (
              <p>
                {bookMoves.length > 1 ? "The main move, " : ""}
                <strong>{moveLabel(bookMoves[0])}</strong>: {firstSentence(bookMoves[0].explanation)}
              </p>
            )}
            <div className="buttons">
              <button onClick={() => dispatch({ type: "delete" })}>Take back</button>
              <button onClick={() => restart()}>Start again</button>
            </div>
          </section>
        )}

        {state.kind === "end" && (
          <section className="card verdict-good">
            <h2>End of the book line</h2>
            <p>You followed the book all the way. Start again to meet a different line.</p>
          </section>
        )}

        {status.kind !== "playing" && <p className="status status-over">{describeStatus(status)}</p>}

        {/* The explanation of the last book move: what the app just played, or what you just played. */}
        {state.kind !== "off-book" && state.node.san && <OpeningNote node={state.node} />}
      </aside>
    </div>
  );
}
