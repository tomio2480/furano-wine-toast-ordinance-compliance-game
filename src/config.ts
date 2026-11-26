// 調整値はすべてここへ集める（要件書「参加者と飲み物」）．
// 時間はすべて ms の整数で表す．

/** 制限時間． */
export const GAME_DURATION_MS = 60_000;

/** 開始と再開のカウントダウン． */
export const COUNTDOWN_MS = 3_000;

/** 乾杯の 1 単位の長さ． */
export const KANPAI_UNIT_MS = 100;

/**
 * 1 回あたりの得点．表記は値の元ネタに合わせ，0167 や 076 は先頭の 0 を残す．
 * 計算には先頭の 0 を除いた数値を使う．
 */
export interface ScoreUnit {
  /** 計算に使う値．減点は負の数． */
  readonly points: number;
  /** 画面に出す表記．符号と先頭の 0 を含む． */
  readonly label: string;
}

/**
 * 画面と投稿文の負の数に使う記号（U+2212）．ハイフンと混ぜず，正の数の「+」と幅をそろえる．
 * 遊び方の HTML も同じ記号で書く．
 */
export const MINUS_SIGN = "−";

function gain(digits: string): ScoreUnit {
  return { points: Number(digits), label: `+${digits}` };
}

function loss(digits: string): ScoreUnit {
  return { points: -Number(digits), label: `${MINUS_SIGN}${digits}` };
}

/** 命中と誤射の得点． */
export const HIT_SCORE = gain("076");
export const MISFIRE_SCORE = loss("38");

/** 乾杯の 1 単位あたりの得点．中立の間は増減しない． */
export const KANPAI_UNIT_SCORE = {
  plus: gain("237"),
  minus: loss("0167"),
} as const;

/** 共有するゲームの URL．location.href は使わず，余計な文字列を混ぜない． */
export const GAME_URL = "https://tomio2480.github.io/furano-wine-toast-ordinance-compliance-game/";

export const HASHTAG = "#乾杯条例ガーディアン";

export interface TitleRank {
  /** この称号になる最低の得点． */
  readonly minScore: number;
  readonly title: string;
}

/** 称号（要件書の表 11）．高い順に並べる．閾値は難易度の調整後に確定する． */
export const TITLES: readonly TitleRank[] = [
  { minScore: 100_000, title: "名誉乾杯奉行" },
  { minScore: 70_000, title: "乾杯奉行" },
  { minScore: 40_000, title: "乾杯係" },
  { minScore: 0, title: "乾杯見習い" },
  { minScore: Number.NEGATIVE_INFINITY, title: "雪まみれの幹事" },
];

/** 参加者の滞在時間の範囲． */
export const STAY_MS = { min: 2_000, max: 4_000 } as const;

/** 最初の参加者が現れるまでの時間． */
export const FIRST_SPAWN_MS = 300;

/** 退場の演出を見せる時間．この間も枠はふさがったままとする． */
export const EXIT_ANIMATION_MS = 450;

/** 外れた雪玉が飛んで散るまでを見せる時間． */
export const MISS_ANIMATION_MS = 500;

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

/** 長テーブルの天板の上端と，幕板の下端（論理座標）． */
export const TABLE = { top: 332, apronBottom: 372 } as const;

/**
 * @param hidden 足もとからテーブルに隠れる高さ．当たり判定から除く
 */
function slot(id: number, row: Row, x: number, y: number, scale: number, hidden = 0): Slot {
  const width = FIGURE.width * scale;
  const height = FIGURE.height * scale;
  return {
    id,
    row,
    x,
    y,
    scale,
    hitbox: { x: x - width / 2, y: y - height, width, height: height - hidden },
  };
}

const BACK_HIDDEN = 24;

/** 出現の枠．奥の列 4 枠と手前の列 3 枠．数字キーの 1〜7 に対応する． */
export const SLOTS: readonly Slot[] = [
  slot(1, "back", 54, TABLE.apronBottom, 0.78, BACK_HIDDEN),
  slot(2, "back", 138, TABLE.apronBottom, 0.78, BACK_HIDDEN),
  slot(3, "back", 222, TABLE.apronBottom, 0.78, BACK_HIDDEN),
  slot(4, "back", 306, TABLE.apronBottom, 0.78, BACK_HIDDEN),
  slot(5, "front", 72, 520, 1),
  slot(6, "front", 180, 520, 1),
  slot(7, "front", 288, 520, 1),
];
