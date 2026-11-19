import { describe, expect, it } from "vitest";
import { buildSquareStyles } from "./highlights";

describe("buildSquareStyles", () => {
  it("never uses the 'background' shorthand (React warns when it is mixed with backgroundColor)", () => {
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
      expect(style).not.toHaveProperty("background");
    }
    // The checked king is both selected and in check: both layers are kept.
    expect(styles.e8.backgroundColor).toBeDefined();
    expect(styles.e8.backgroundImage).toContain("radial-gradient");
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
});
