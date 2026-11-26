import type { SoundName } from "../audio/sfx";
import type { GameState } from "../core/game";

/**
 * 投げた結果に合う効果音を返す．投げる前と後の状態を比べ，何も起きなければ鳴らさない．
 * 時間切れの直後は，結果の画面へ移る前でも投げた操作を記録しないためである．
 */
export function throwSound(before: GameState, after: GameState): SoundName | undefined {
  if (after.hits > before.hits) {
    return "hit";
  }
  if (after.misfires > before.misfires) {
    return "misfire";
  }
  const lastMiss = after.misses.at(-1);
  return lastMiss !== undefined && !before.misses.includes(lastMiss) ? "throw" : undefined;
}
