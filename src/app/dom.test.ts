import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announce } from "./dom";

/** ライブリージョンの代役．書き込まれた文を順に記録する． */
function liveRegion(initial = "") {
  const written: string[] = [];
  let text = initial;
  return {
    written,
    get textContent(): string {
      return text;
    },
    set textContent(value: string) {
      text = value;
      written.push(value);
    },
  };
}

describe("announce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("違う文はすぐに書く", () => {
    const region = liveRegion("前の文");
    announce(region, "コピーしました。");
    expect(region.written).toEqual(["コピーしました。"]);
  });

  it("同じ文は，いったん空にしてから書き直し，もう一度読み上げさせる", () => {
    const region = liveRegion("コピーしました。");
    announce(region, "コピーしました。");
    expect(region.textContent).toBe("");
    vi.runAllTimers();
    expect(region.written).toEqual(["", "コピーしました。"]);
  });

  it("書き直す前に次の文が来たら，前の書き直しは取り消す", () => {
    const region = liveRegion("コピーしました。");
    announce(region, "コピーしました。");
    announce(region, "コピーできませんでした。");
    vi.runAllTimers();
    expect(region.textContent).toBe("コピーできませんでした。");
    expect(region.written).toEqual(["", "コピーできませんでした。"]);
  });
});
