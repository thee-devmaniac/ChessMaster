import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { kingsGambit } from "@/data/openings/kingsGambit";
import { buildOpening } from "./build";
import { allLines, firstSentence, locate, moveLabel } from "./navigate";
import { OPENING_ROOT, type OpeningSpec } from "./types";

const kg = buildOpening(kingsGambit);
const sansOf = (ids: string[]) => ids.map((id) => kg.nodes[id].san);

describe("King's Gambit data", () => {
  it("builds without errors: every authored move is legal", () => {
    expect(Object.keys(kg.nodes).length).toBeGreaterThan(25);
  });

  it("starts 1. e4 e5 2. f4 and offers the four replies from the book", () => {
    const afterF4 = kg.nodes["e4 e5 f4"];
    expect(afterF4.name).toBe("King's Gambit");
    expect(afterF4.children.map((c) => kg.nodes[c].san)).toEqual(["d5", "Bc5", "exf4", "Nf6"]);
  });

  it("contains the Falkbeer main line from the brief, ending in a position rated equal", () => {
    const main = allLines(kg)[0];
    expect(main.name).toBe("Falkbeer Counter-Gambit");
    expect(sansOf(main.ids).join(" ")).toBe(
      "e4 e5 f4 d5 exd5 e4 d3 Nf6 Nd2 exd3 Bxd3 Nxd5 Qf3 Nc6 a3 Bc5 Ne2 O-O Nb3 Be7",
    );
    expect(kg.nodes[main.ids.at(-1)!].verdict).toBe("equal");
  });

  it("the trap really works: 4. Ke2 is mated, and 4. g3 loses the rook", () => {
    const mate = kg.nodes["e4 e5 f4 Bc5 fxe5 Qh4+ Ke2 Qxe4#"];
    expect(new Chess(mate.fen).isCheckmate()).toBe(true);

    const rook = kg.nodes["e4 e5 f4 Bc5 fxe5 Qh4+ g3 Qxe4+ Qe2 Qxh1"];
    const board = new Chess(rook.fen);
    expect(board.get("h1")).toEqual({ type: "q", color: "b" }); // Black's queen has taken the rook
    expect(board.findPiece({ type: "r", color: "w" })).toEqual(["a1"]); // White has one rook left
  });

  it("records whose turn it is and the move number", () => {
    const d5 = kg.nodes["e4 e5 f4 d5"];
    expect(d5.turn).toBe("w");
    expect(d5.moveNumber).toBe(2);
    expect(moveLabel(d5)).toBe("2... d5");
    expect(moveLabel(kg.nodes["e4 e5 f4"])).toBe("2. f4");
  });

  it("fails loudly on an illegal move in the data", () => {
    const bad: OpeningSpec = {
      id: "bad",
      name: "Bad",
      playAs: "w",
      moveOrder: "",
      summary: "",
      intro: "",
      source: "",
      moves: [{ san: "e4", explanation: "", next: [{ san: "Ke7", explanation: "" }] }],
    };
    expect(() => buildOpening(bad)).toThrow('Illegal move "Ke7" after "e4" in Bad');
  });
});

describe("allLines", () => {
  it("lists every line once, named by the deepest name on it", () => {
    const names = allLines(kg).map((l) => l.name);
    expect(names).toContain("Trap: 3. fxe5? Qh4+ 4. g3");
    expect(names).toContain("Trap: 3. fxe5? Qh4+ 4. Ke2");
    expect(new Set(names).size).toBe(names.length); // every line has its own name
    expect(names).toContain("King's Gambit Accepted");
    expect(new Set(allLines(kg).map((l) => l.ids.join("|"))).size).toBe(names.length);
  });
});

describe("locate", () => {
  it("follows the book while the moves match", () => {
    const r = locate(kg, ["e4", "e5", "f4", "d5"]);
    expect(r.offBookAt).toBeNull();
    expect(r.node.name).toBe("Falkbeer Counter-Gambit");
  });

  it("reports the first move that leaves the book, and the last book position", () => {
    const r = locate(kg, ["e4", "e5", "f4", "d6", "Nf3"]); // 2...d6 is not in this module
    expect(r.offBookAt).toBe(3);
    expect(r.node.id).toBe("e4 e5 f4");
  });

  it("is at the start for an empty game", () => {
    expect(locate(kg, []).node.id).toBe(OPENING_ROOT);
  });
});

describe("firstSentence", () => {
  it("cuts after the first full stop", () => {
    expect(firstSentence("Check! White has two replies.")).toBe("Check!");
    expect(firstSentence("No full stop")).toBe("No full stop");
  });
});
