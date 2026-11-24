import { describe, expect, it } from "vitest";
import { kanpaiMode } from "./kanpai";

describe("kanpaiMode（表 5）", () => {
  it("押していなければ中立", () => {
    expect(kanpaiMode(false, ["beer"])).toBe("neutral");
  });

  it("誰もいなければ中立", () => {
    expect(kanpaiMode(true, [])).toBe("neutral");
  });

  it("全員が適合なら加点", () => {
    expect(kanpaiMode(true, ["wineRed", "grapeJuice"])).toBe("plus");
  });

  it("不適合者が 1 人でもいれば減点", () => {
    expect(kanpaiMode(true, ["wineRed", "cola"])).toBe("minus");
  });
});
