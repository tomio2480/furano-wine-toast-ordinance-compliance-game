// 調整値はすべてここへ集める（要件書「参加者と飲み物」）．
// 時間はすべて ms の整数で表す．

/** 制限時間． */
export const GAME_DURATION_MS = 60_000;

/** 開始と再開のカウントダウン． */
export const COUNTDOWN_MS = 3_000;

/** 乾杯の 1 単位の長さ． */
export const KANPAI_UNIT_MS = 100;

/** 命中と誤射の得点． */
export const HIT_SCORE = 237;
export const MISFIRE_SCORE = -237;

/** 乾杯の 1 単位あたりの得点． */
export const KANPAI_UNIT_SCORE = {
  plus: 38,
  minus: -76,
  neutral: 0,
} as const;

/** 参加者の滞在時間の範囲． */
export const STAY_MS = { min: 2_000, max: 4_000 } as const;

/** 最初の参加者が現れるまでの時間． */
export const FIRST_SPAWN_MS = 300;

/** 退場の演出を見せる時間．この間も枠はふさがったままとする． */
export const EXIT_ANIMATION_MS = 450;

export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface DifficultyPhase {
  /** この段階が終わる経過時間（この値を含まない）． */
  readonly untilMs: number;
  readonly spawnIntervalMs: Range;
  readonly nonCompliantRatio: number;
  readonly maxVisible: number;
}

/** 難易度の段階（要件書の表 3）．最後の段階は時間切れまで続く． */
export const DIFFICULTY: readonly DifficultyPhase[] = [
  {
    untilMs: 20_000,
    spawnIntervalMs: { min: 900, max: 1_300 },
    nonCompliantRatio: 0.35,
    maxVisible: 4,
  },
  {
    untilMs: 40_000,
    spawnIntervalMs: { min: 700, max: 1_000 },
    nonCompliantRatio: 0.45,
    maxVisible: 5,
  },
  {
    untilMs: Number.POSITIVE_INFINITY,
    spawnIntervalMs: { min: 500, max: 800 },
    nonCompliantRatio: 0.5,
    maxVisible: 6,
  },
];

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Row = "back" | "front";

export interface Slot {
  readonly id: number;
  readonly row: Row;
  /** 足もとの中心（論理座標）． */
  readonly x: number;
  readonly y: number;
  /** 描画の倍率．手前の列ほど大きい． */
  readonly scale: number;
  /** 当たり判定．体と飲み物を含め，44 × 44 以上を確保する． */
  readonly hitbox: Rect;
}

/** 論理座標系の大きさ．縦長のスマートフォン画面を基準にする． */
export const STAGE = { width: 360, height: 640 } as const;

const FIGURE = { width: 72, height: 150 } as const;

function slot(id: number, row: Row, x: number, y: number, scale: number): Slot {
  const width = FIGURE.width * scale;
  const height = FIGURE.height * scale;
  return {
    id,
    row,
    x,
    y,
    scale,
    hitbox: { x: x - width / 2, y: y - height, width, height },
  };
}

/** 出現の枠．奥の列 4 枠と手前の列 3 枠．数字キーの 1〜7 に対応する． */
export const SLOTS: readonly Slot[] = [
  slot(1, "back", 54, 332, 0.78),
  slot(2, "back", 138, 332, 0.78),
  slot(3, "back", 222, 332, 0.78),
  slot(4, "back", 306, 332, 0.78),
  slot(5, "front", 72, 520, 1),
  slot(6, "front", 180, 520, 1),
  slot(7, "front", 288, 520, 1),
];
