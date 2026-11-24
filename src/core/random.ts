import type { Range } from "../config";

/** 0 以上 1 未満の値を返す乱数．テストで固定できるよう外から注入する． */
export type Random = () => number;

const UINT32_RANGE = 2 ** 32;

/** シード付きの乱数（mulberry32）．定数はアルゴリズムが定めるもの． */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/** min 以上 max 以下の整数を返す． */
export function randomInt(random: Random, range: Range): number {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

export function pick<T>(random: Random, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) {
    throw new RangeError("空の配列からは選べません");
  }
  return item;
}
