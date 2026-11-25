import { HIT_SCORE, MISFIRE_SCORE } from "../config";
import type { Exit, ExitReason } from "../core/game";
import type { Point } from "../core/targeting";

/** 開始からの経過を 0〜1 の割合で返す． */
export function progress(nowMs: number, startMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
}

/** 始点から終点へ放物線を描く位置．height は中間での持ち上がり． */
export function arcPoint(from: Point, to: Point, t: number, height: number): Point {
  const lift = height * 4 * t * (1 - t);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t - lift,
  };
}

export interface Popup {
  readonly text: string;
  readonly tone: "good" | "bad";
}

const EXIT_POPUPS: Partial<Record<ExitReason, Popup>> = {
  hit: { text: `+${HIT_SCORE}`, tone: "good" },
  misfire: { text: String(MISFIRE_SCORE), tone: "bad" },
};

/** 退場に添える得点の表示．時間切れの退場には出さない． */
export function exitPopup(exit: Exit): Popup | undefined {
  return EXIT_POPUPS[exit.reason];
}
