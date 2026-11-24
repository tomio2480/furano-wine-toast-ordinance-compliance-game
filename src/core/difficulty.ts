import { DIFFICULTY, type DifficultyPhase } from "../config";

const FINAL_PHASE = DIFFICULTY[DIFFICULTY.length - 1];

/** 経過時間に応じた難易度の段階を返す．最後の段階は時間切れまで続く． */
export function difficultyAt(elapsedMs: number): DifficultyPhase {
  if (FINAL_PHASE === undefined) {
    throw new Error("難易度の段階が 1 つもありません");
  }
  return DIFFICULTY.find((phase) => elapsedMs < phase.untilMs) ?? FINAL_PHASE;
}
