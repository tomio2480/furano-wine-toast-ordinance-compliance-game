import { describe, expect, it } from "vitest";
import { unitsFor } from "./score";

describe("unitsFor", () => {
  it.each([
    [0, 0],
    [1, 1],
    [10, 1],
    [50, 1],
    [100, 1],
    [101, 2],
    [180, 2],
    [250, 3],
    [1_000, 10],
  ])("%i ms は %i 単位", (durationMs, units) => {
    expect(unitsFor(durationMs)).toBe(units);
  });

  it("負の長さは 0 単位として扱う", () => {
    expect(unitsFor(-5)).toBe(0);
  });
});
