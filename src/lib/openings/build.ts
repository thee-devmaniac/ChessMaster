import { Chess } from "chess.js";
import { STARTING_FEN } from "@/lib/chess/fen";
import { OPENING_ROOT, type MoveSpec, type Opening, type OpeningNode, type OpeningSpec } from "./types";

/**
 * Turns an authored opening into a tree of nodes, with chess.js checking every
 * move and computing every position. Throws on an illegal move, naming the
 * line, so a typo in the data fails loudly (and a test catches it).
 */
export function buildOpening(spec: OpeningSpec): Opening {
  const nodes: Record<string, OpeningNode> = {
    [OPENING_ROOT]: {
      id: OPENING_ROOT,
      parent: null,
      san: null,
      uci: null,
      fen: STARTING_FEN,
      turn: "w",
      moveNumber: 0,
      explanation: spec.intro,
      tags: [],
      alsoGood: [],
      children: [],
    },
  };

  function add(parentId: string, move: MoveSpec) {
    const parent = nodes[parentId];
    const chess = new Chess(parent.fen);
    let played;
    try {
      played = chess.move(move.san);
    } catch {
      throw new Error(`Illegal move "${move.san}" after "${parentId || "start"}" in ${spec.name}`);
    }
    // Use chess.js's spelling of the move (e.g. it adds "+" for check).
    const id = parentId ? `${parentId} ${played.san}` : played.san;
    // "Also good" moves must be legal in the same position (checked like any other move).
    const alsoGood = (move.alsoGood ?? []).map((alt) => {
      try {
        return { san: new Chess(parent.fen).move(alt.san).san, note: alt.note };
      } catch {
        throw new Error(`Illegal "also good" move "${alt.san}" after "${parentId || "start"}" in ${spec.name}`);
      }
    });
    if (nodes[id]) throw new Error(`Duplicate move "${played.san}" after "${parentId || "start"}" in ${spec.name}`);

    nodes[id] = {
      id,
      parent: parentId,
      san: played.san,
      uci: played.lan,
      fen: chess.fen(),
      turn: chess.turn(),
      moveNumber: Number(parent.fen.split(" ")[5]),
      explanation: move.explanation,
      name: move.name,
      verdict: move.verdict,
      tags: move.tags ?? [],
      alsoGood,
      children: [],
    };
    parent.children.push(id);
    for (const next of move.next ?? []) add(id, next);
  }

  for (const first of spec.moves) add(OPENING_ROOT, first);
  return {
    id: spec.id,
    name: spec.name,
    playAs: spec.playAs,
    moveOrder: spec.moveOrder,
    summary: spec.summary,
    intro: spec.intro,
    source: spec.source,
    nodes,
  };
}
