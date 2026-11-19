"use client";

import { useReducer, useState } from "react";
import { ChessBoard, type BoardArrow, type Orientation } from "@/components/board/ChessBoard";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { buildSquareStyles } from "@/components/board/highlights";
import { IDLE, choosePromotion, clickSquare, type ClickState } from "@/lib/chess/clickToMove";
import { describeStatus } from "@/lib/chess/describe";
import { currentFen, currentStatus, newSession, sessionReducer, type SessionAction } from "@/lib/chess/game";
import { checkedKingSquare, turn, type PromotionPiece } from "@/lib/chess/rules";
import { ROOT, moveNumberOf, pathTo } from "@/lib/chess/tree";
import { firstSentence, locate, moveLabel, toMoveInput } from "@/lib/openings/navigate";
import type { Opening } from "@/lib/openings/types";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { OpeningNote } from "./OpeningNote";

const MAIN_ARROW = "rgba(37, 99, 235, 0.8)"; // blue: the main book move
const ALT_ARROW = "rgba(37, 99, 235, 0.35)"; // pale blue: other book moves

/**
 * Explore: move freely. While you follow the book, the app explains each
 * move and shows the known replies. A legal move that isn't in the book is
 * allowed, marked "off-book", and the app shows where the known line went.
 * Moves you try are kept as variations, so you can compare branches.
 */
export function ExploreMode({ opening }: { opening: Opening }) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => newSession());
  const [click, setClick] = useState<ClickState>(IDLE);
  const [orientation, setOrientation] = useState<Orientation>("white");
  const [showHints, setShowHints] = useState(true);

  const { tree, current } = session;
  const fen = currentFen(session);
  const status = currentStatus(session);
  const path = pathTo(tree, current);
  const sans = path.map((id) => tree.nodes[id].move!.san);
  const { node: bookNode, offBookAt } = locate(opening, sans);
  const inBook = offBookAt === null;
  const replies = inBook ? bookNode.children.map((id) => opening.nodes[id]) : [];

  function act(action: SessionAction) {
    setClick(IDLE);
    dispatch(action);
  }
  useKeyboardNav({
    back: () => act({ type: "back" }),
    forward: () => act({ type: "forward" }),
    start: () => act({ type: "start" }),
    end: () => act({ type: "end" }),
  });

  function handleSquareClick(square: string) {
    if (status.kind !== "playing") return;
    const result = clickSquare(fen, click, square);
    setClick(result.state);
    if (result.move) dispatch({ type: "play", move: result.move });
  }

  function handlePromotion(piece: PromotionPiece) {
    const result = choosePromotion(click, piece);
    setClick(result.state);
    if (result.move) dispatch({ type: "play", move: result.move });
  }

  const arrows: BoardArrow[] =
    showHints && click.kind === "idle"
      ? replies.map((r, i) => ({
          from: r.uci!.slice(0, 2),
          to: r.uci!.slice(2, 4),
          color: i === 0 ? MAIN_ARROW : ALT_ARROW,
        }))
      : [];
  const squareStyles = buildSquareStyles({
    click,
    lastMove: tree.nodes[current].move,
    checkSquare: checkedKingSquare(fen),
  });

  // Off-book: the move that left the book, and the last position that was still in it.
  let offBook: { label: string; lastBookId: string } | null = null;
  if (offBookAt !== null) {
    const { number, color } = moveNumberOf(tree, path[offBookAt]);
    offBook = {
      label: `${number}${color === "w" ? "." : "..."} ${sans[offBookAt]}`,
      lastBookId: offBookAt === 0 ? ROOT : path[offBookAt - 1],
    };
  }

  return (
    <div className="layout">
      <section className="board board-wrap">
        <ChessBoard
          fen={fen}
          orientation={orientation}
          onSquareClick={handleSquareClick}
          squareStyles={squareStyles}
          arrows={arrows}
        />
        {click.kind === "choosingPromotion" && (
          <PromotionPicker color={turn(fen)} onChoose={handlePromotion} onCancel={() => setClick(IDLE)} />
        )}
      </section>

      <aside className="panel">
        <p className={`status ${status.kind !== "playing" ? "status-over" : ""}`}>{describeStatus(status)}</p>

        <div className="nav">
          <button onClick={() => act({ type: "start" })} disabled={current === ROOT} title="Start (Home)">⏮</button>
          <button onClick={() => act({ type: "back" })} disabled={current === ROOT} title="Back (←)">◀</button>
          <button onClick={() => act({ type: "forward" })} disabled={tree.nodes[current].children.length === 0} title="Forward (→)">▶</button>
          <button onClick={() => act({ type: "end" })} disabled={tree.nodes[current].children.length === 0} title="End (End)">⏭</button>
        </div>

        {!offBook ? (
          <OpeningNote node={bookNode} intro={opening.intro} />
        ) : (
          <section className="card off-book">
            <h2>Off-book</h2>
            <p>
              <strong>{offBook.label}</strong> is not part of this lesson.{" "}
              {bookNode.children.length > 0 ? (
                <>
                  The known {bookNode.children.length === 1 ? "move here was" : "moves here were"}:{" "}
                  <strong>{bookNode.children.map((c) => opening.nodes[c].san).join(", ")}</strong>.
                </>
              ) : (
                <>The lesson&apos;s line had already ended here.</>
              )}{" "}
              The move is still legal, so you can keep exploring.
            </p>
            <div className="buttons">
              <button onClick={() => act({ type: "goTo", id: offBook.lastBookId })}>Back to the last book position</button>
            </div>
          </section>
        )}

        {inBook && (
          <section className="card">
            <div className="card-header">
              <h2>{replies.length > 0 ? "Known replies" : "End of the book line"}</h2>
              <label className="toggle">
                <input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} />
                Arrows
              </label>
            </div>
            {replies.length === 0 ? (
              <p className="muted">This lesson has no further moves here. Any move you play now is off-book.</p>
            ) : (
              <ul className="reply-list">
                {replies.map((r, i) => (
                  <li key={r.id}>
                    <button onClick={() => act({ type: "play", move: toMoveInput(r) })}>
                      <span className="reply-move">
                        {moveLabel(r)}
                        {i === 0 && <span className="chip">main</span>}
                        {r.tags.includes("trap") && <span className="chip tag-trap">trap</span>}
                        {r.tags.includes("mistake") && <span className="chip tag-mistake">mistake</span>}
                      </span>
                      <span className="muted">{r.name ? `${r.name}: ` : ""}{firstSentence(r.explanation)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <MoveList tree={tree} current={current} onSelect={(id) => act({ type: "goTo", id })} />

        <div className="buttons">
          <button onClick={() => act({ type: "new", startFen: tree.startFen })}>Start again</button>
          <button onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}>Flip board</button>
        </div>
      </aside>
    </div>
  );
}
