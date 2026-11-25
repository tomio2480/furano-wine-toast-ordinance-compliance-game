import { describe, expect, it } from "vitest";
import { difficultyAt } from "./difficulty";

describe("difficultyAt（表 3）", () => {
  it.each([
    [0, 4, 0.35],
    [19_999, 4, 0.35],
    [20_000, 5, 0.45],
    [39_999, 5, 0.45],
    [40_000, 6, 0.5],
    [60_000, 6, 0.5],
  ])("%i ms では同時表示 %i 人，不適合 %f", (elapsedMs, maxVisible, ratio) => {
    const phase = difficultyAt(elapsedMs);
    expect(phase.maxVisible).toBe(maxVisible);
    expect(phase.nonCompliantRatio).toBe(ratio);
  });
});
