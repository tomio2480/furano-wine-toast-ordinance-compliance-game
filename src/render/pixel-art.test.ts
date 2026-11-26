import { describe, expect, it } from "vitest";
import { bandColor, binarize, outline, paintGlyph, shadow, toWebSafe } from "./pixel-art";

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

describe("bandColor", () => {
  const palette = ["#ff9", "#fc0", "#f60"];

  it("上から下へ，色を帯に分けて割り当てる", () => {
    expect([0, 2, 4, 8].map((row) => bandColor(row, 0, 8, palette))).toEqual(["#ff9", "#ff9", "#fc0", "#f60"]);
  });

  it("範囲の外の行は端の色にする", () => {
    expect(bandColor(-3, 0, 8, palette)).toBe("#ff9");
    expect(bandColor(20, 0, 8, palette)).toBe("#f60");
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
