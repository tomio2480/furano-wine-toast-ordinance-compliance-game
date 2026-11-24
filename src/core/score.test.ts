import { describe, expect, it } from "vitest";
import { kanpaiDelta, unitsFor } from "./score";

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

describe("kanpaiDelta", () => {
  it("加点は 1 単位あたり +38", () => {
    expect(kanpaiDelta("plus", 1_000)).toBe(380);
  });

  it("減点は 1 単位あたり −76", () => {
    expect(kanpaiDelta("minus", 120)).toBe(-152);
  });

  it("中立は長さによらず 0", () => {
    expect(kanpaiDelta("neutral", 1_000)).toBe(0);
  });

  it("長さ 0 の区間は 0", () => {
    expect(kanpaiDelta("plus", 0)).toBe(0);
  });
});
