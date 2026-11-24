import { formatKanpaiSeconds, formatScore } from "../app/format";
import { GAME_URL, HASHTAG } from "../config";
import type { GameResult } from "../core/game";

/** 投稿文．URL は SNS ごとに渡し方が違うため，本文と分けて持つ． */
export interface ShareText {
  readonly body: string;
  readonly url: string;
}

/** 投稿文（要件書の案 B）を組み立てる． */
export function buildShareText(result: GameResult): ShareText {
  const seconds = formatKanpaiSeconds(result.kanpaiPlusUnits);
  const score = formatScore(result.score);
  return {
    body: `ワインとぶどう果汁以外は雪玉で退場。命中${result.hits}人、乾杯${seconds}秒、合計${score}点でした。\n${HASHTAG}`,
    url: GAME_URL,
  };
}

/** 本文と URL をまとめた文．コピーと Bluesky で使う． */
export function fullShareText(text: ShareText): string {
  return `${text.body}\n${text.url}`;
}

/** X が 1 文字と数える範囲．これ以外は 2 文字と数える． */
const X_LIGHT_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];
const X_URL_WEIGHT = 23;
const X_URL_SEPARATOR_WEIGHT = 1;

function xCharWeight(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  const isLight = X_LIGHT_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high);
  return isLight ? 1 : 2;
}

/**
 * X の投稿画面での文字数．URL は長さによらず 23 と数え，本文との間に空白が 1 つ入る．
 * X はコードポイントごとに重みを付けるため，書記素ではなくコードポイントで数える．
 */
export function xWeightedLength(text: ShareText): number {
  const weights = Array.from(text.body, xCharWeight);
  const bodyWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return bodyWeight + X_URL_SEPARATOR_WEIGHT + X_URL_WEIGHT;
}

const graphemes = new Intl.Segmenter("ja", { granularity: "grapheme" });

/** Bluesky の投稿画面での文字数（書記素の数）． */
export function blueskyLength(text: ShareText): number {
  return [...graphemes.segment(fullShareText(text))].length;
}

export interface ShareLinks {
  readonly x: string;
  readonly bluesky: string;
  readonly threads: string;
}

/** 各 SNS の投稿画面の URL．利用者が本文を編集してから投稿できる． */
export function shareLinks(text: ShareText): ShareLinks {
  const body = encodeURIComponent(text.body);
  const url = encodeURIComponent(text.url);
  return {
    x: `https://x.com/intent/tweet?text=${body}&url=${url}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(fullShareText(text))}`,
    threads: `https://www.threads.com/intent/post?text=${body}&url=${url}`,
  };
}
