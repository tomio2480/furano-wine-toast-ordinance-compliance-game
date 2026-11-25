import { describe, expect, it } from "vitest";
import { GAME_URL } from "../config";
import type { GameResult } from "../core/game";
import { blueskyLength, buildShareText, shareLinks, xWeightedLength } from "./share";

function result(overrides: Partial<GameResult> = {}): GameResult {
  return {
    score: 313,
    hits: 3,
    misfires: 0,
    hitPoints: 711,
    misfirePoints: 0,
    kanpaiPlusPoints: 456,
    kanpaiMinusPoints: -912,
    kanpaiPlusUnits: 12,
    kanpaiMinusUnits: 12,
    ...overrides,
  };
}

describe("buildShareText（案 B）", () => {
  it("得点・命中数・乾杯秒数・ハッシュタグを含める", () => {
    expect(buildShareText(result())).toEqual({
      body: "ワインとぶどう果汁以外は雪玉で退場。命中3人、乾杯1.2秒、合計313点でした。\n#乾杯条例ガーディアン",
      url: GAME_URL,
    });
  });

  it("マイナスと桁区切りを表示する", () => {
    expect(buildShareText(result({ score: -1_234 })).body).toContain("合計-1,234点");
  });

  it("乾杯秒数は小数第 1 位まで示す", () => {
    expect(buildShareText(result({ kanpaiPlusUnits: 600 })).body).toContain("乾杯60.0秒");
  });
});

describe("文字数", () => {
  const worst = result({ score: -99_999, hits: 999, kanpaiPlusUnits: 600 });

  it("X の重み付き文字数（全角 2，URL 23）の上限 280 に収まる", () => {
    expect(xWeightedLength(buildShareText(worst))).toBeLessThanOrEqual(280);
  });

  it("Bluesky の上限 300 文字に収まる", () => {
    expect(blueskyLength(buildShareText(worst))).toBeLessThanOrEqual(300);
  });

  it("全角に換算して 100 文字以内に収める", () => {
    expect(xWeightedLength(buildShareText(worst)) / 2).toBeLessThanOrEqual(100);
  });

  it("X の重みは全角を 2，半角を 1，URL を 23 と数える", () => {
    expect(xWeightedLength({ body: "あa", url: GAME_URL })).toBe(2 + 1 + 1 + 23);
  });

  it.each([
    ["U+10FF", "ჿ", 1],
    ["U+1100", "ᄀ", 2],
    ["U+200D", "‍", 1],
    ["U+200E", "‎", 2],
    ["U+2010", "‐", 1],
    ["U+201F", "‟", 1],
    ["U+2020", "†", 2],
    ["U+2032", "′", 1],
    ["U+2037", "‷", 1],
    ["U+2038", "‸", 2],
    ["読点（U+3001）", "、", 2],
  ])("X の重みの境界: %s は %i", (_label, char, weight) => {
    expect(xWeightedLength({ body: char, url: GAME_URL })).toBe(weight + 1 + 23);
  });
});

describe("shareLinks", () => {
  const links = shareLinks(buildShareText(result()));

  it("X には本文と URL を別のパラメータで渡す", () => {
    const url = new URL(links.x);
    expect(url.origin + url.pathname).toBe("https://x.com/intent/tweet");
    expect(url.searchParams.get("text")).toContain("合計313点");
    expect(url.searchParams.get("url")).toBe(GAME_URL);
  });

  it("Bluesky には本文と URL を text にまとめる", () => {
    const url = new URL(links.bluesky);
    expect(url.origin + url.pathname).toBe("https://bsky.app/intent/compose");
    expect(url.searchParams.get("text")).toBe(`${buildShareText(result()).body}\n${GAME_URL}`);
  });

  it("Threads には本文と URL を別のパラメータで渡す", () => {
    const url = new URL(links.threads);
    expect(url.origin + url.pathname).toBe("https://www.threads.com/intent/post");
    expect(url.searchParams.get("text")).toBe(buildShareText(result()).body);
    expect(url.searchParams.get("url")).toBe(GAME_URL);
  });

  it("符号化して渡し，追跡用のパラメータは付けない", () => {
    expect(links.x).toContain("%23");
    expect(links.x).not.toContain("utm_");
    expect([...new URL(links.x).searchParams.keys()]).toEqual(["text", "url"]);
  });
});
