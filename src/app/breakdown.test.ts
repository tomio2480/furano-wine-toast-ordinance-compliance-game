import { describe, expect, it } from "vitest";
import { breakdownRows } from "./breakdown";

describe("breakdownRows（結果画面の内訳）", () => {
  it("命中・乾杯の加点・乾杯の減点・誤射の 4 項目を返す", () => {
    const rows = breakdownRows({
      score: 1_918,
      hits: 3,
      misfires: 2,
      hitPoints: 228,
      misfirePoints: -76,
      kanpaiPlusPoints: 7_110,
      kanpaiMinusPoints: -5_344,
      kanpaiPlusUnits: 30,
      kanpaiMinusUnits: 32,
    });
    expect(rows).toEqual([
      { label: "命中", detail: "3 人", points: "+228" },
      { label: "乾杯の加点", detail: "3.0 秒", points: "+7,110" },
      { label: "乾杯の減点", detail: "3.2 秒", points: "−5,344" },
      { label: "誤射", detail: "2 回", points: "−76" },
    ]);
  });

  it("0 点の項目は符号を付けない", () => {
    const rows = breakdownRows({
      score: 0,
      hits: 0,
      misfires: 0,
      hitPoints: 0,
      misfirePoints: 0,
      kanpaiPlusPoints: 0,
      kanpaiMinusPoints: 0,
      kanpaiPlusUnits: 0,
      kanpaiMinusUnits: 0,
    });
    expect(rows.map((row) => row.points)).toEqual(["0", "0", "0", "0"]);
  });
});
