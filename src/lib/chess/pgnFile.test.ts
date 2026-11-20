import { describe, expect, it } from "vitest";
import { describeTimeControl, readHeaders, splitPgnGames, summarisePgn } from "./pgnFile";
import { importPgn } from "./rules";

// Four games in Chess.com's export format (players renamed), the way a user pastes them.
const FOUR = `[Event "Play vs Coach"]
[Site "Chess.com"]
[White "PlayerA"]
[Black "Coach-Bot"]
[Result "1-0"]
[TimeControl "-"]

1. g3 e6 2. b3 c5 3. d3 Qa5+ 4. Bd2 b5 5. Bxa5 1-0

[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.11.08"]
[White "PlayerA"]
[Black "PlayerB"]
[Result "1-0"]
[TimeControl "1800"]
[Termination "PlayerA won - game abandoned"]

1. e3 c6 2. b3 d5 3. f4 Nf6 4. Bd3 Bg4 5. Nf3 Bxf3 6. gxf3 e6 7. O-O Nbd7 8. e4
dxe4 9. fxe4 Nh5 10. Qxh5 1-0

[Event "Live Chess"]
[White "PlayerB"]
[Black "PlayerA"]
[Result "1-0"]
[TimeControl "900+10"]

1. e4 {[%clk 0:15:08]} 1... g6 {[%clk 0:15:05]} 2. Nf3 {[%clk 0:15:10]} 1-0

[Event "Live Chess"]
[White "PlayerA"]
[Black "PlayerB"]
[Result "0-1"]
[TimeControl "600"]
[Termination "PlayerB won by checkmate"]

1. c4 c6 2. f3 d5 3. Nh3 dxc4 4. Nc3 Bxh3 5. gxh3 Nf6 6. e4 Nbd7 7. Bxc4 Ne5 8.
O-O Nxc4 9. d3 Ne5 10. Be3 e6 11. b4 Bxb4 12. Na4 O-O 13. h4 h6 14. Rb1 Qxd3 15.
Qxd3 Nxd3 16. Bxa7 Rxa7 17. Rfd1 Rd8 18. Rxd3 Rxd3 19. Rxb4 Rxf3 20. Rxb7 Rxb7
21. Nc5 Rb1+ 22. Kg2 Rc3 23. Nd7 Rb2+ 24. Kf1 Rc1# 0-1
`;

describe("splitPgnGames", () => {
  it("splits pasted games at each new header block", () => {
    const games = splitPgnGames(FOUR);
    expect(games).toHaveLength(4);
    expect(games[1].startsWith('[Event "Live Chess"]')).toBe(true);
    expect(games[3].endsWith("Rc1# 0-1")).toBe(true);
  });

  it("every piece is a valid game on its own", () => {
    for (const g of splitPgnGames(FOUR)) expect(importPgn(g).ok).toBe(true);
  });

  it("keeps a single game whole, and handles Windows line endings", () => {
    expect(splitPgnGames("1. e4 e5 2. Nf3")).toEqual(["1. e4 e5 2. Nf3"]);
    expect(splitPgnGames(FOUR.replace(/\n/g, "\r\n"))).toHaveLength(4);
  });

  it("is not fooled by clock comments at the start of a wrapped line", () => {
    const wrapped = '[White "A"]\n[Black "B"]\n\n1. e4\n{[%clk 0:09:58]} 1... e5\n{[%clk 0:09:57]} *';
    expect(splitPgnGames(wrapped)).toHaveLength(1);
  });

  it("returns nothing for empty text", () => {
    expect(splitPgnGames("  \n ")).toEqual([]);
  });
});

describe("summarisePgn", () => {
  const list = summarisePgn(FOUR);

  it("lists players, result, time control and length from the headers", () => {
    expect(list[3]).toMatchObject({
      index: 3,
      white: "PlayerA",
      black: "PlayerB",
      result: "0-1",
      timeControl: "600",
      termination: "PlayerB won by checkmate",
      moves: 24,
    });
    expect(list[1].date).toBe("2026.11.08");
  });

  it("doesn't count numbers inside clock comments as moves", () => {
    expect(list[2].moves).toBe(2);
  });

  it("fills in missing names", () => {
    expect(summarisePgn("1. e4 e5")[0]).toMatchObject({ white: "White", black: "Black", result: "*", moves: 1 });
  });
});

describe("helpers", () => {
  it("reads headers", () => {
    expect(readHeaders('[White "A b"]\n[Result "1-0"]\n\n1. e4')).toEqual({ White: "A b", Result: "1-0" });
  });

  it("describes time controls", () => {
    expect(describeTimeControl("600")).toBe("10 min");
    expect(describeTimeControl("900+10")).toBe("15 min + 10s");
    expect(describeTimeControl("180+0")).toBe("3 min");
    expect(describeTimeControl("-")).toBe("no clock");
    expect(describeTimeControl("1/259200")).toBe("correspondence");
  });
});
