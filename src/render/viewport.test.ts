import { describe, expect, it, vi } from "vitest";
import { textBoost, toStagePoint, watchPixelRatio, type PixelRatioSource } from "./viewport";

/** 画素密度を変えられる window の代役．登録された media query と，その変化の通知を持つ． */
function fakeWindow(initialRatio: number) {
  const queries: { media: string; notify: () => void }[] = [];
  const source = {
    devicePixelRatio: initialRatio,
    matchMedia: (media: string) => ({
      addEventListener: (_type: "change", listener: () => void) => {
        queries.push({ media, notify: listener });
      },
    }),
  } satisfies PixelRatioSource;
  return { source, queries };
}

describe("textBoost", () => {
  it.each([
    [200, 1],
    [430, 1],
    [516, 1.2],
    [645, 1.5],
    [1_200, 1.5],
  ])("舞台の幅 %i CSS px では %f 倍", (width, boost) => {
    expect(textBoost(width)).toBeCloseTo(boost, 5);
  });
});

describe("watchPixelRatio", () => {
  it("今の画素密度から外れたら知らせ，新しい画素密度で見張り直す", () => {
    const { source, queries } = fakeWindow(2);
    const onChange = vi.fn();
    watchPixelRatio(source, onChange);
    expect(queries.map((query) => query.media)).toEqual(["(resolution: 2dppx)"]);
    source.devicePixelRatio = 1;
    queries[0]?.notify();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(queries.map((query) => query.media)).toEqual(["(resolution: 2dppx)", "(resolution: 1dppx)"]);
  });
});

describe("toStagePoint", () => {
  it("表示の大きさが論理座標と同じなら位置だけずらす", () => {
    const rect = { left: 10, top: 20, width: 360, height: 640 };
    expect(toStagePoint(190, 340, rect)).toEqual({ x: 180, y: 320 });
  });

  it("拡大表示されていれば論理座標へ縮める", () => {
    const rect = { left: 0, top: 0, width: 720, height: 1_280 };
    expect(toStagePoint(360, 640, rect)).toEqual({ x: 180, y: 320 });
  });
});
