import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, parseClockComment, parseTimeControl } from "./clock";

describe("parseClockComment", () => {
  it("reads Chess.com and Lichess clock tags", () => {
    expect(parseClockComment("[%clk 0:02:59.8]")).toBe(179_800); // Chess.com
    expect(parseClockComment(" [%eval 0.2] [%clk 0:09:58] ")).toBe(598_000); // Lichess, with an eval tag first
    expect(parseClockComment("[%clk 1:30:00]")).toBe(5_400_000); // classical
  });

  it("returns undefined when there is no clock", () => {
    expect(parseClockComment(undefined)).toBeUndefined();
    expect(parseClockComment("a nice move")).toBeUndefined();
  });
});

describe("parseTimeControl", () => {
  it("reads base and increment", () => {
    expect(parseTimeControl("180+2")).toEqual({ baseMs: 180_000, incMs: 2_000 });
    expect(parseTimeControl("600")).toEqual({ baseMs: 600_000, incMs: 0 });
  });

  it("ignores games without a normal clock", () => {
    expect(parseTimeControl("-")).toBeUndefined(); // no time limit
    expect(parseTimeControl("1/259200")).toBeUndefined(); // correspondence: days per move
    expect(parseTimeControl(undefined)).toBeUndefined();
  });
});

describe("formatting", () => {
  it("formats clocks, with tenths only under a minute", () => {
    expect(formatClock(179_800)).toBe("2:59");
    expect(formatClock(9_400)).toBe("0:09.4");
    expect(formatClock(9_000)).toBe("0:09");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });

  it("formats durations", () => {
    expect(formatDuration(2_400)).toBe("2.4s");
    expect(formatDuration(3_000)).toBe("3s");
    expect(formatDuration(30_000)).toBe("30s");
    expect(formatDuration(75_000)).toBe("1m 15s");
    expect(formatDuration(120_000)).toBe("2m");
  });
});
