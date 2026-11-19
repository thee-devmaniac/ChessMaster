import { describe, expect, it } from "vitest";
import { kingsGambit } from "@/data/openings/kingsGambit";
import { buildOpening } from "./build";
import { checkGuess, hintsFor, isQuizMove, moverOf } from "./predict";
import { pickReply, practiceState } from "./practice";
import { OPENING_ROOT } from "./types";

const kg = buildOpening(kingsGambit);
const n = (id: string) => kg.nodes[id];

describe("Predict: checkGuess", () => {
  const nf3 = n("e4 e5 f4 Bc5 Nf3"); // expected answer after 2...Bc5

  it("accepts the expected move", () => {
    expect(checkGuess(kg, nf3, "Nf3")).toEqual({ kind: "correct" });
  });

  it("recognises a book move marked as a mistake, so its explanation can be shown", () => {
    const r = checkGuess(kg, nf3, "fxe5");
    expect(r.kind).toBe("book-mistake");
    if (r.kind === "book-mistake") expect(r.node.explanation).toContain("natural-looking mistake");
  });

  it("recognises another good book move that this line doesn't follow", () => {
    const d5 = n("e4 e5 f4 d5"); // line expects 2...d5; Black guesses 2...Bc5
    expect(checkGuess(kg, d5, "Bc5").kind).toBe("other-book");
  });

  it("calls anything else wrong", () => {
    expect(checkGuess(kg, nf3, "Nc3").kind).toBe("wrong");
  });
});

describe("Predict: who is quizzed", () => {
  it("knows which side plays each move", () => {
    expect(moverOf(kg, n("e4 e5 f4"))).toBe("w");
    expect(moverOf(kg, n("e4 e5 f4 d5"))).toBe("b");
    expect(isQuizMove(kg, n("e4 e5 f4 d5"), "w")).toBe(false);
    expect(isQuizMove(kg, n("e4 e5 f4 d5"), "b")).toBe(true);
    expect(isQuizMove(kg, n("e4 e5 f4 d5"), "both")).toBe(true);
  });

  it("never quizzes a move the book marks as a mistake (the trap is played for you)", () => {
    expect(isQuizMove(kg, n("e4 e5 f4 Bc5 fxe5"), "w")).toBe(false);
    expect(isQuizMove(kg, n("e4 e5 f4 Bc5 fxe5"), "both")).toBe(false);
    expect(isQuizMove(kg, n("e4 e5 f4 Bc5 fxe5 Qh4+"), "b")).toBe(true); // but punishing it is
  });
});

describe("Predict: hints", () => {
  it("go from the piece, to the square, to the answer", () => {
    expect(hintsFor(kg, n("e4 e5 f4 Bc5 fxe5 Qh4+"))).toEqual([
      "Look at your queen. The move gives check.",
      "The queen on d8 moves.",
      "The answer is Qh4+.",
    ]);
  });

  it("mention a capture", () => {
    expect(hintsFor(kg, n("e4 e5 f4 d5 exd5"))[0]).toBe("Look at your pawns. Something can be captured.");
  });

  it("describe castling without naming a piece", () => {
    const castle = n("e4 e5 f4 d5 exd5 e4 d3 Nf6 Nd2 exd3 Bxd3 Nxd5 Qf3 Nc6 a3 Bc5 Ne2 O-O");
    expect(hintsFor(kg, castle)[2]).toBe("The answer is O-O (castling).");
  });
});

describe("Practice: pickReply", () => {
  const afterF4 = n("e4 e5 f4"); // 4 book replies: d5 (main), Bc5, exf4, Nf6

  it("always plays the main line when asked to", () => {
    expect(pickReply(kg, afterF4, { mainOnly: true, random: 0.99 })?.san).toBe("d5");
  });

  it("gives the main line double weight, and still reaches every other move", () => {
    // Weights 2,1,1,1 out of 5: [0, 0.4) d5, [0.4, 0.6) Bc5, [0.6, 0.8) exf4, [0.8, 1) Nf6
    expect(pickReply(kg, afterF4, { mainOnly: false, random: 0.0 })?.san).toBe("d5");
    expect(pickReply(kg, afterF4, { mainOnly: false, random: 0.39 })?.san).toBe("d5");
    expect(pickReply(kg, afterF4, { mainOnly: false, random: 0.45 })?.san).toBe("Bc5");
    expect(pickReply(kg, afterF4, { mainOnly: false, random: 0.7 })?.san).toBe("exf4");
    expect(pickReply(kg, afterF4, { mainOnly: false, random: 0.95 })?.san).toBe("Nf6");
  });

  it("returns null at the end of a line", () => {
    expect(pickReply(kg, n("e4 e5 f4 exf4"), { mainOnly: false })).toBeNull();
  });
});

describe("Practice: practiceState", () => {
  it("waits for the player, or for the app, depending on whose turn it is", () => {
    expect(practiceState(kg, [], "w").kind).toBe("your-move");
    expect(practiceState(kg, [], "b").kind).toBe("app-move");
    expect(practiceState(kg, ["e4"], "b").kind).toBe("your-move");
  });

  it("reports when the player leaves the book, and where", () => {
    const s = practiceState(kg, ["e4", "e5", "f4", "d6"], "b");
    expect(s).toMatchObject({ kind: "off-book", at: 3 });
    expect(s.node.id).toBe("e4 e5 f4");
  });

  it("reports the end of a line", () => {
    expect(practiceState(kg, ["e4", "e5", "f4", "exf4"], "b").kind).toBe("end");
  });

  it("starts at the root", () => {
    expect(practiceState(kg, [], "w").node.id).toBe(OPENING_ROOT);
  });
});
