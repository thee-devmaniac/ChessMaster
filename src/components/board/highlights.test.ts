import { describe, expect, it } from "vitest";
import { buildSquareStyles } from "./highlights";

describe("buildSquareStyles", () => {
  it("only ever sets backgroundImage (no 'background' shorthand, no backgroundColor)", () => {
    const styles = buildSquareStyles({
      click: {
        kind: "selected",
        from: "e8",
        targets: [
          { to: "d8", isCapture: false, isPromotion: false },
          { to: "f7", isCapture: true, isPromotion: false },
        ],
      },
      lastMove: { from: "h5", to: "f7" },
      checkSquare: "e8",
    });
    for (const style of Object.values(styles)) {
      expect(Object.keys(style)).toEqual(["backgroundImage"]);
    }
  });

  it("stacks layers on one square: the check glow sits above the selection tint", () => {
    const { e8 } = buildSquareStyles({
      click: { kind: "selected", from: "e8", targets: [] },
      checkSquare: "e8",
    });
    const layers = String(e8.backgroundImage);
    expect(layers.indexOf("radial-gradient")).toBeLessThan(layers.indexOf("linear-gradient"));
  });

  it("shows a dot for a move and a ring for a capture", () => {
    const styles = buildSquareStyles({
      click: {
        kind: "selected",
        from: "e4",
        targets: [
          { to: "e5", isCapture: false, isPromotion: false },
          { to: "d5", isCapture: true, isPromotion: false },
        ],
      },
    });
    expect(styles.e5.backgroundImage).not.toBe(styles.d5.backgroundImage);
  });

  it("marks both squares of the last move", () => {
    const styles = buildSquareStyles({ click: { kind: "idle" }, lastMove: { from: "e2", to: "e4" } });
    expect(Object.keys(styles).sort()).toEqual(["e2", "e4"]);
  });
});
