import { isCompliant, type DrinkId } from "./drinks";
import type { KanpaiMode } from "./score";

/**
 * 乾杯の状態を返す（要件書の表 5）．
 * @param isHeld 乾杯ボタンが押されているか（H）
 * @param visibleDrinks 表示中の参加者の飲み物（S）．命中済みと退場演出中は含めない
 */
export function kanpaiMode(isHeld: boolean, visibleDrinks: readonly DrinkId[]): KanpaiMode {
  if (!isHeld || visibleDrinks.length === 0) {
    return "neutral";
  }
  return visibleDrinks.every(isCompliant) ? "plus" : "minus";
}
