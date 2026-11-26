import { describe, expect, it } from "vitest";
import { countdownNumber, formatRemainingSeconds, formatScore, kanpaiStatus } from "./format";

describe("formatScore", () => {
  it.each([
    [0, "0"],
    [313, "313"],
    [12_345, "12,345"],
    [-237, "-237"],
  ])("%i は %s", (score, text) => {
    expect(formatScore(score)).toBe(text);
  });
});

describe("formatRemainingSeconds", () => {
  it.each([
    [60_000, "60"],
    [59_001, "60"],
    [59_000, "59"],
    [1, "1"],
    [0, "0"],
  ])("残り %i ms は %s 秒", (remainingMs, text) => {
    expect(formatRemainingSeconds(remainingMs)).toBe(text);
  });
});

describe("countdownNumber", () => {
  it.each([
    [3_000, 3],
    [2_001, 3],
    [2_000, 2],
    [1, 1],
    [0, 1],
  ])("残り %i ms は %i", (remainingMs, value) => {
    expect(countdownNumber(remainingMs)).toBe(value);
  });
});

describe("kanpaiStatus", () => {
  it("状態を色以外に文字でも示す", () => {
    expect(kanpaiStatus("plus")).toBe("加点中 +237");
    expect(kanpaiStatus("minus")).toBe("減点中 -0167 不適合者がいます");
    expect(kanpaiStatus("neutral")).toBe("長押しで乾杯");
  });
});
