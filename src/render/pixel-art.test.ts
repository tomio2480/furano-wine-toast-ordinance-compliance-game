import { describe, expect, it } from "vitest";
import { bayer, binarize, ditherColor, outline, paintGlyph, shadow, toWebSafe } from "./pixel-art";

/** 文字列の図から形を作る．「#」が形のドット． */
function maskFrom(rows: readonly string[]): { mask: boolean[]; width: number; height: number } {
  return {
    mask: rows.flatMap((row) => Array.from(row, (cell) => cell === "#")),
    width: rows[0]?.length ?? 0,
    height: rows.length,
  };
}

function picture(mask: readonly boolean[], width: number): string[] {
  const rows: string[] = [];
  for (let start = 0; start < mask.length; start += width) {
    rows.push(
      mask
        .slice(start, start + width)
        .map((cell) => (cell ? "#" : "."))
        .join(""),
    );
  }
  return rows;
}

describe("toWebSafe", () => {
  it.each([
    [0, 0],
    [25, 0],
    [26, 51],
    [128, 153],
    [255, 255],
  ])("%i はウェブセーフカラーの %i に丸める", (channel, safe) => {
    expect(toWebSafe(channel)).toBe(safe);
  });
});

describe("binarize", () => {
  it("不透明度がしきい値以上のドットだけを形にする（GIF の透明は 1 色だけのため）", () => {
    expect(binarize([0, 127, 128, 255])).toEqual([false, false, true, true]);
  });
});

describe("outline", () => {
  it("形を 1 ドットの縁で囲み，形そのものは含めない", () => {
    const { mask, width, height } = maskFrom([".....", ".....", "..#..", ".....", "....."]);
    expect(picture(outline(mask, width, height), width)).toEqual([".....", ".###.", ".#.#.", ".###.", "....."]);
  });

  it("端では外へはみ出さない", () => {
    const { mask, width, height } = maskFrom(["#..", "...", "..."]);
    expect(picture(outline(mask, width, height), width)).toEqual([".#.", "##.", "..."]);
  });
});

describe("shadow", () => {
  it("形と縁を右下へずらし，重なるところは除く", () => {
    const { mask, width, height } = maskFrom(["##..", "##..", "....", "...."]);
    const edge = outline(mask, width, height);
    expect(picture(shadow(mask, edge, width, height), width)).toEqual(["....", "...#", "...#", ".###"]);
  });
});

describe("bayer", () => {
  it("4 × 4 のマスに 0〜15 の閾値を 1 つずつ置き，4 ドットごとに繰り返す", () => {
    const block = [0, 1, 2, 3].flatMap((y) => [0, 1, 2, 3].map((x) => bayer(x, y)));
    expect([...block].sort((a, b) => a - b)).toEqual([...Array(16).keys()]);
    expect(bayer(5, 6)).toBe(bayer(1, 2));
  });

  it("隣り合うドットの閾値は離す（同じ色が固まらないように）", () => {
    expect(Math.abs(bayer(0, 0) - bayer(1, 0))).toBeGreaterThanOrEqual(4);
    expect(Math.abs(bayer(0, 0) - bayer(0, 1))).toBeGreaterThanOrEqual(4);
  });
});

describe("ditherColor", () => {
  const palette = ["#ff0", "#f00"];
  const block = (row: number, height: number) =>
    [0, 1, 2, 3].flatMap((y) => [0, 1, 2, 3].map((x) => ditherColor(x, y, row, height, palette)));

  it("上端は最初の色，下端は最後の色だけで塗る", () => {
    expect(new Set(block(0, 9))).toEqual(new Set(["#ff0"]));
    expect(new Set(block(8, 9))).toEqual(new Set(["#f00"]));
  });

  it("中ほどでは，隣り合う 2 色を点描で半分ずつ混ぜる", () => {
    const colors = block(4, 9);
    expect(colors.filter((color) => color === "#ff0")).toHaveLength(8);
    expect(colors.filter((color) => color === "#f00")).toHaveLength(8);
  });

  it("下へ進むほど，次の色の点が増える", () => {
    const share = (row: number) => block(row, 9).filter((color) => color === "#f00").length;
    expect(share(2)).toBeLessThan(share(4));
    expect(share(4)).toBeLessThan(share(6));
  });
});

describe("paintGlyph", () => {
  it("形・縁・影を，透明か不透明かの 2 値で塗る", () => {
    const { mask, width, height } = maskFrom(["...", ".#.", "..."]);
    const pixels = paintGlyph(mask, width, height, {
      fill: ["#ff0000"],
      outline: "#00ff00",
      shadow: "#0000ff",
    });
    const at = (x: number, y: number) => [...pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];
    expect(at(1, 1)).toEqual([255, 0, 0, 255]);
    expect(at(0, 0)).toEqual([0, 255, 0, 255]);
    expect(at(2, 2)).toEqual([0, 255, 0, 255]);
    expect(new Set([...pixels.filter((_, index) => index % 4 === 3)])).toEqual(new Set([255]));
  });

  it("形のない画像は，すべて透明のまま返す", () => {
    const pixels = paintGlyph([false, false, false, false], 2, 2, { fill: ["#fff"], outline: "#000", shadow: "#000" });
    expect([...pixels]).toEqual(new Array(16).fill(0));
  });
});
