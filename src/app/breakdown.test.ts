import { describe, expect, it } from "vitest";
import { breakdownRows } from "./breakdown";

describe("breakdownRows（結果画面の内訳）", () => {
  it("命中・乾杯の加点・乾杯の減点・誤射の 4 項目を返す", () => {
    const rows = breakdownRows({
      score: -1_017,
      hits: 3,
      misfires: 2,
      hitPoints: 711,
      misfirePoints: -474,
      kanpaiPlusPoints: 1_140,
      kanpaiMinusPoints: -2_394,
      kanpaiPlusUnits: 30,
    });
    expect(rows).toEqual([
      { label: "命中", detail: "3 人", points: "+711" },
      { label: "乾杯の加点", detail: "3.0 秒", points: "+1,140" },
      { label: "乾杯の減点", detail: "", points: "-2,394" },
      { label: "誤射", detail: "2 回", points: "-474" },
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
    });
    expect(rows.map((row) => row.points)).toEqual(["0", "0", "0", "0"]);
  });
});
