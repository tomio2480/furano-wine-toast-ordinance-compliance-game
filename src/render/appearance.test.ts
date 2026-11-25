import { describe, expect, it } from "vitest";
import { appearanceFor } from "./appearance";

describe("appearanceFor", () => {
  it("同じ参加者は同じ見た目", () => {
    expect(appearanceFor(5)).toEqual(appearanceFor(5));
  });

  it("続けて現れる参加者は見た目が変わる", () => {
    const looks = Array.from({ length: 30 }, (_, i) => JSON.stringify(appearanceFor(i + 1)));
    const repeats = looks.filter((look, i) => look === looks[i + 1]);
    expect(repeats).toEqual([]);
  });

  it("体型・服装・髪型を組み合わせて多様にする", () => {
    const looks = Array.from({ length: 60 }, (_, i) => appearanceFor(i + 1));
    expect(new Set(looks.map((look) => look.build)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(looks.map((look) => look.hairStyle)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(looks.map((look) => look.outfit)).size).toBeGreaterThanOrEqual(4);
  });
});
