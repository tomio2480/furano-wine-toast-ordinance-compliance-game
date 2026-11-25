import { TITLES } from "../config";

/** 得点に応じた称号を返す（要件書の表 11）． */
export function titleFor(score: number): string {
  const rank = TITLES.find((item) => score >= item.minScore);
  if (rank === undefined) {
    throw new RangeError(`${score} 点に当てはまる称号がありません`);
  }
  return rank.title;
}
