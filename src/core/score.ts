import { KANPAI_UNIT_MS, KANPAI_UNIT_SCORE } from "../config";

export type KanpaiMode = keyof typeof KANPAI_UNIT_SCORE | "neutral";

/** 区間の長さ（ms）から単位数を返す．0 ms 以下なら 0． */
export function unitsFor(durationMs: number): number {
  return Math.ceil(Math.max(0, durationMs) / KANPAI_UNIT_MS);
}
