"use client";

import type { Color, PromotionPiece } from "@/lib/chess/rules";

const CHOICES: { piece: PromotionPiece; name: string; white: string; black: string }[] = [
  { piece: "q", name: "Queen", white: "♕", black: "♛" },
  { piece: "r", name: "Rook", white: "♖", black: "♜" },
  { piece: "b", name: "Bishop", white: "♗", black: "♝" },
  { piece: "n", name: "Knight", white: "♘", black: "♞" },
];

interface Props {
  color: Color;
  onChoose: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

/**
 * Shown when a pawn reaches the last rank. Almost always you want a queen
 * (the strongest piece), but sometimes a knight is better, for example when a
 * knight gives check, or a queen would cause stalemate.
 */
export function PromotionPicker({ color, onChoose, onCancel }: Props) {
  return (
    <div className="promotion-backdrop" onClick={onCancel}>
      <div
        className="promotion-picker"
        role="dialog"
        aria-label="Choose a piece to promote to"
        onClick={(e) => e.stopPropagation()}
      >
        <p>Promote to:</p>
        <div className="promotion-choices">
          {CHOICES.map((c) => (
            <button key={c.piece} onClick={() => onChoose(c.piece)} title={c.name}>
              <span className="promotion-glyph">{color === "w" ? c.white : c.black}</span>
              {c.name}
            </button>
          ))}
        </div>
        <button className="link-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
