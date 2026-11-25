import { describe, expect, it } from "vitest";
import { createRandom, pick, randomInt } from "./random";

describe("createRandom", () => {
  it("同じシードなら同じ列を返す", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).toEqual(seqB);
  });

  it("シードが違えば別の列を返す", () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it("0 以上 1 未満の値を返す", () => {
    const random = createRandom(7);
    const values = Array.from({ length: 1_000 }, random);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("randomInt", () => {
  it("min と max を含む整数を返す", () => {
    expect(randomInt(() => 0, { min: 900, max: 1_300 })).toBe(900);
    expect(randomInt(() => 0.999_999, { min: 900, max: 1_300 })).toBe(1_300);
  });
});

describe("pick", () => {
  it("乱数に応じて要素を選ぶ", () => {
    expect(pick(() => 0, ["a", "b", "c"])).toBe("a");
    expect(pick(() => 0.5, ["a", "b", "c"])).toBe("b");
    expect(pick(() => 0.999, ["a", "b", "c"])).toBe("c");
  });

  it("空の配列からは選べない", () => {
    expect(() => pick(() => 0, [])).toThrow(RangeError);
  });
});
