import { describe, expect, it } from "vitest";
import { GAME_DURATION_MS } from "../config";
import type { DrinkId } from "../core/drinks";
import { advance, appear, createGame, missAt, throwAt } from "../core/game";
import { throwSound } from "./throw-sound";

const EMPTY_SPOT = { x: 180, y: 600 };

/** 枠 1 に，時間切れまで残る参加者を 1 人だけ置く． */
function withGuest(drink: DrinkId) {
  const game = createGame({ firstSpawnAtMs: Number.POSITIVE_INFINITY });
  return appear(game, { slotId: 1, drink, stayMs: GAME_DURATION_MS * 2 });
}

describe("throwSound", () => {
  it("不適合者に当てたら命中の音", () => {
    const before = withGuest("beer");
    expect(throwSound(before, throwAt(before, 1))).toBe("hit");
  });

  it("適合者に当てたら誤射の音", () => {
    const before = withGuest("wineRed");
    expect(throwSound(before, throwAt(before, 1))).toBe("misfire");
  });

  it("誰もいない所へ投げたら投げる音", () => {
    const before = createGame();
    expect(throwSound(before, missAt(before, EMPTY_SPOT))).toBe("throw");
  });

  it("前に外れた雪玉が残っていても，新しく投げていなければ鳴らさない", () => {
    const before = missAt(createGame(), EMPTY_SPOT);
    expect(throwSound(before, before)).toBeUndefined();
  });

  it("時間切れの後に投げても何も起きないので，どの音も鳴らさない", () => {
    const ended = advance(withGuest("wineRed"), GAME_DURATION_MS, () => 0);
    expect(throwSound(ended, throwAt(ended, 1))).toBeUndefined();
    expect(throwSound(ended, missAt(ended, EMPTY_SPOT))).toBeUndefined();
  });
});
