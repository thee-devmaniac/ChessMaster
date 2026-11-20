import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { OPENINGS, openingById } from "./index";
import { buildOpening } from "@/lib/openings/build";
import { allLines } from "@/lib/openings/navigate";
import { checkGuess, isQuizMove } from "@/lib/openings/predict";

const built = OPENINGS.map(buildOpening);
const london = buildOpening(openingById("london-system")!);
const caro = buildOpening(openingById("caro-kann")!);

/** The position after a sequence of moves (chess.js checks each one). */
function play(sans: string) {
  const c = new Chess();
  for (const m of sans.split(" ")) c.move(m);
  return c;
}

describe("every opening lesson", () => {
  it("has a unique id and builds: every move and every 'also good' move is legal", () => {
    expect(new Set(OPENINGS.map((o) => o.id)).size).toBe(OPENINGS.length);
    expect(built.length).toBe(OPENINGS.length);
  });

  it("gives every line its own name, so the line list never shows two the same", () => {
    for (const o of built) {
      const names = allLines(o).map((l) => l.name);
      expect(new Set(names).size, `${o.name}: ${names.join(" | ")}`).toBe(names.length);
    }
  });

  it("has an explanation for every move", () => {
    for (const o of built) {
      for (const n of Object.values(o.nodes)) expect(n.explanation.length, n.id).toBeGreaterThan(0);
    }
  });

  it("never lists a lesson move or a book move as also good", () => {
    for (const o of built) {
      for (const n of Object.values(o.nodes)) {
        if (n.parent === null) continue; // the starting position
        const siblings = o.nodes[n.parent].children.map((id) => o.nodes[id].san);
        for (const alt of n.alsoGood) expect(siblings, `${o.name} ${n.id}`).not.toContain(alt.san);
      }
    }
  });
});

describe("London System", () => {
  it("is played as White and puts the bishop on f4 before e3", () => {
    expect(london.playAs).toBe("w");
    expect(london.nodes["d4 d5"].children[0]).toBe("d4 d5 Bf4");
  });

  it("accepts Bxd6 and Bd3 as also good answers to ...Bd6", () => {
    const bg3 = london.nodes["d4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bg3"];
    expect(checkGuess(london, bg3, "Bg3")).toEqual({ kind: "correct" });
    expect(checkGuess(london, bg3, "Bxd6").kind).toBe("also-good");
    expect(checkGuess(london, bg3, "Bd3").kind).toBe("also-good");
    expect(checkGuess(london, bg3, "Bg5").kind).toBe("wrong");
  });

  it("the 3...Nh5? trap: the queen really can take the knight for free", () => {
    const c = play("d4 d5 Bf4 Nf6 e3 Nh5 Qxh5");
    expect(c.get("h5")).toEqual({ type: "q", color: "w" });
    expect(c.attackers("h5", "b")).toEqual([]); // nothing of Black's can take back
    expect(london.nodes["d4 d5 Bf4 Nf6 e3 Nh5"].tags).toContain("mistake");
  });
});

describe("Caro-Kann Defence", () => {
  it("is played as Black, so Predict quizzes Black's moves", () => {
    expect(caro.playAs).toBe("b");
    expect(isQuizMove(caro, caro.nodes["e4 c6"], caro.playAs)).toBe(true);
    expect(isQuizMove(caro, caro.nodes["e4"], caro.playAs)).toBe(false);
  });

  it("brings the bishop out before ...e6 in the Classical and the Advance", () => {
    expect(caro.nodes["e4 c6 d4 d5 Nc3 dxe4 Nxe4"].children[0]).toBe("e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5");
    expect(caro.nodes["e4 c6 d4 d5 e5"].children[0]).toBe("e4 c6 d4 d5 e5 Bf5");
  });

  it("the trap: 5...Ngf6?? is mated by Nd6, and 5...Ndf6 is the move to find", () => {
    expect(play("e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ngf6 Nd6").isCheckmate()).toBe(true);
    const qe2 = caro.nodes["e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2"];
    const [safe, blunder] = qe2.children.map((id) => caro.nodes[id]);
    expect(safe.san).toBe("Ndf6");
    expect(blunder.tags).toContain("mistake");
    expect(isQuizMove(caro, blunder, "b")).toBe(false); // never asked to find the blunder
    // After the safe move, Nd6+ is no longer mate: the queen guards d6.
    expect(play("e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ndf6").moves()).toContain("Nd6+");
    expect(play("e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ndf6 Nd6+").moves()).toContain("Qxd6");
  });
});
