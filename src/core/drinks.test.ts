import { describe, expect, it } from "vitest";
import { COMPLIANT_DRINKS, DRINKS, NON_COMPLIANT_DRINKS, isCompliant } from "./drinks";

describe("適合判定", () => {
  it.each(["wineRed", "wineWhite", "wineRose", "grapeJuice"] as const)(
    "%s は適合",
    (id) => {
      expect(isCompliant(id)).toBe(true);
    },
  );

  it.each(["beer", "sake", "highball", "oolongTea", "cola", "hotCoffee"] as const)(
    "%s は不適合",
    (id) => {
      expect(isCompliant(id)).toBe(false);
    },
  );

  it("適合 4 種と不適合 6 種に分かれる", () => {
    expect(COMPLIANT_DRINKS).toHaveLength(4);
    expect(NON_COMPLIANT_DRINKS).toHaveLength(6);
  });

  it("表記は条文に合わせる", () => {
    expect(DRINKS.wineRed.name).toBe("ふらのワイン（赤）");
    expect(DRINKS.grapeJuice.name).toBe("ふらのぶどう果汁");
  });
});
