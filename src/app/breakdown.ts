import type { GameResult } from "../core/game";
import { formatKanpaiSeconds, formatSignedScore } from "./format";

export interface BreakdownRow {
  readonly label: string;
  readonly detail: string;
  readonly points: string;
}

/** 結果画面の内訳．命中数，乾杯の加点，乾杯の減点，誤射の 4 項目とする． */
export function breakdownRows(result: GameResult): BreakdownRow[] {
  return [
    { label: "命中", detail: `${result.hits} 人`, points: formatSignedScore(result.hitPoints) },
    {
      label: "乾杯の加点",
      detail: `${formatKanpaiSeconds(result.kanpaiPlusUnits)} 秒`,
      points: formatSignedScore(result.kanpaiPlusPoints),
    },
    { label: "乾杯の減点", detail: "", points: formatSignedScore(result.kanpaiMinusPoints) },
    { label: "誤射", detail: `${result.misfires} 回`, points: formatSignedScore(result.misfirePoints) },
  ];
}
