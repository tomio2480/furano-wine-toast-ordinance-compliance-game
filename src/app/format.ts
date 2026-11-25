import { KANPAI_UNIT_SCORE } from "../config";
import type { KanpaiMode } from "../core/score";

const MS_PER_SECOND = 1_000;

export function formatScore(score: number): string {
  return score.toLocaleString("ja-JP");
}

/** 残り時間を秒の整数で示す．0.1 秒でも残っていれば切り上げる． */
export function formatRemainingSeconds(remainingMs: number): string {
  return String(Math.ceil(Math.max(0, remainingMs) / MS_PER_SECOND));
}

/** カウントダウンの数字（3，2，1）． */
export function countdownNumber(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / MS_PER_SECOND));
}

const KANPAI_STATUS: Readonly<Record<KanpaiMode, string>> = {
  plus: `加点中 +${KANPAI_UNIT_SCORE.plus}`,
  minus: `減点中 ${KANPAI_UNIT_SCORE.minus} 不適合者がいます`,
  neutral: "長押しで乾杯",
};

/** 乾杯の状態を，色に加えて文字でも示す． */
export function kanpaiStatus(mode: KanpaiMode): string {
  return KANPAI_STATUS[mode];
}
