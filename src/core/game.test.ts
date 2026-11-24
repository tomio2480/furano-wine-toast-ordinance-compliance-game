import { describe, expect, it } from "vitest";
import { EXIT_ANIMATION_MS, FIRST_SPAWN_MS, GAME_DURATION_MS, SLOTS } from "../config";
import { difficultyAt } from "./difficulty";
import type { DrinkId } from "./drinks";
import {
  advance,
  appear,
  createGame,
  isTimeUp,
  setHeld,
  summarize,
  throwAt,
  type GameState,
} from "./game";
import { createRandom } from "./random";

const random = createRandom(1);
const LONG_STAY_MS = 30_000;

/** 自動の出現を止めた状態から始める． */
function quietGame(): GameState {
  return createGame({ firstSpawnAtMs: Number.POSITIVE_INFINITY });
}

function enter(state: GameState, slotId: number, drink: DrinkId): GameState {
  return appear(state, { slotId, drink, stayMs: LONG_STAY_MS });
}

describe("得点計算の受け入れテスト（表 6）", () => {
  it.each([
    [1_000, 380],
    [250, 114],
    [10, 38],
  ])("No 1〜3: 全員適合で %i ms 長押しすると %i 点", (holdMs, score) => {
    let game = enter(quietGame(), 1, "wineRed");
    game = setHeld(game, true);
    game = advance(game, holdMs, random);
    game = setHeld(game, false);
    expect(summarize(game).score).toBe(score);
  });

  it("No 4: 加点 0.35 秒の後，不適合者が出現し減点 0.12 秒で離すと 0 点", () => {
    let game = setHeld(enter(quietGame(), 1, "wineWhite"), true);
    game = advance(game, 350, random);
    game = enter(game, 5, "beer");
    game = advance(game, 470, random);
    game = setHeld(game, false);
    const result = summarize(game);
    expect(result.kanpaiPlusPoints).toBe(152);
    expect(result.kanpaiMinusPoints).toBe(-152);
    expect(result.score).toBe(0);
  });

  it("No 5: 加点 0.50 秒，減点 0.30 秒，命中，加点 0.21 秒で離すと 313 点", () => {
    let game = setHeld(enter(quietGame(), 1, "grapeJuice"), true);
    game = advance(game, 500, random);
    const beerId = game.nextId;
    game = enter(game, 6, "beer");
    game = advance(game, 800, random);
    game = throwAt(game, beerId);
    game = advance(game, 1_010, random);
    game = setHeld(game, false);
    expect(summarize(game).score).toBe(190 - 228 + 237 + 114);
  });

  it("No 6: 誰もいない状態で 1.00 秒長押ししても 0 点", () => {
    let game = setHeld(quietGame(), true);
    game = advance(game, 1_000, random);
    expect(summarize(game).score).toBe(0);
  });

  it("No 7: 加点区間の 0.18 秒時点で時間切れなら 76 点", () => {
    let game = advance(quietGame(), GAME_DURATION_MS - 180, random);
    game = setHeld(enter(game, 2, "wineRose"), true);
    game = advance(game, GAME_DURATION_MS + 5_000, random);
    expect(isTimeUp(game)).toBe(true);
    expect(game.timeMs).toBe(GAME_DURATION_MS);
    expect(summarize(game).kanpaiPlusPoints).toBe(76);
  });
});

describe("雪玉", () => {
  it("不適合者に当てると 237 点を得て，表示中から外れる", () => {
    let game = enter(quietGame(), 3, "cola");
    const [target] = game.participants;
    game = throwAt(game, target?.id ?? -1);
    expect(summarize(game).score).toBe(237);
    expect(game.participants).toEqual([]);
    expect(game.exits.map((exit) => exit.reason)).toEqual(["hit"]);
  });

  it("適合者に当てると 237 点を失う", () => {
    let game = enter(quietGame(), 3, "wineRed");
    const [target] = game.participants;
    game = throwAt(game, target?.id ?? -1);
    expect(summarize(game)).toMatchObject({ score: -237, misfires: 1, misfirePoints: -237 });
    expect(game.exits.map((exit) => exit.reason)).toEqual(["misfire"]);
  });

  it("いない参加者を指定しても何も変わらない", () => {
    const game = enter(quietGame(), 3, "cola");
    expect(throwAt(game, 999)).toBe(game);
  });

  it("時間切れの後は当てても得点が変わらない", () => {
    let game = enter(quietGame(), 3, "cola");
    game = advance(game, GAME_DURATION_MS, random);
    const [target] = game.participants;
    expect(throwAt(game, target?.id ?? -1)).toBe(game);
  });
});

describe("退場", () => {
  it("滞在時間を過ぎた参加者は退場し，その時点で乾杯の状態が変わる", () => {
    let game = enter(quietGame(), 1, "wineRed");
    game = appear(game, { slotId: 2, drink: "sake", stayMs: 2_000 });
    game = setHeld(game, true);
    game = advance(game, 2_000, random);
    expect(game.exits.map((exit) => exit.reason)).toEqual(["timeout"]);
    game = advance(game, 3_000, random);
    const result = summarize(game);
    expect(result.kanpaiMinusPoints).toBe(20 * -76);
    expect(result.kanpaiPlusPoints).toBe(10 * 38);
  });

  it("退場の演出が終わると枠が空く", () => {
    let game = appear(quietGame(), { slotId: 1, drink: "beer", stayMs: 1_000 });
    game = advance(game, 1_000 + EXIT_ANIMATION_MS, random);
    expect(game.exits).toEqual([]);
  });
});

describe("出現の予定", () => {
  it("乱数を固定すると出現の内容が決まる", () => {
    const game = advance(createGame(), FIRST_SPAWN_MS, () => 0);
    expect(game.participants).toEqual([
      { id: 1, slotId: 1, drink: "beer", appearedAtMs: FIRST_SPAWN_MS, leaveAtMs: FIRST_SPAWN_MS + 2_000 },
    ]);
    expect(game.nextSpawnAtMs).toBe(FIRST_SPAWN_MS + 900);
  });

  it("同時表示の上限を超えず，枠も重ならない", () => {
    const seeded = createRandom(20261125);
    let game = createGame();
    for (let t = 0; t <= GAME_DURATION_MS; t += 50) {
      game = advance(game, t, seeded);
      const occupied = [...game.participants.map((p) => p.slotId), ...game.exits.map((e) => e.participant.slotId)];
      expect(game.participants.length).toBeLessThanOrEqual(difficultyAt(t).maxVisible);
      expect(new Set(occupied).size).toBe(occupied.length);
    }
  });

  it("枠がすべて埋まっていれば出現を見送る", () => {
    let game = quietGame();
    for (const slot of SLOTS) {
      game = enter(game, slot.id, "wineRed");
    }
    game = { ...game, nextSpawnAtMs: 100 };
    game = advance(game, 100, () => 0);
    expect(game.participants).toHaveLength(SLOTS.length);
    expect(game.nextSpawnAtMs).toBeGreaterThan(100);
  });
});
