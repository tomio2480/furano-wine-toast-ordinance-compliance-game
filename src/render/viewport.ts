import { STAGE } from "../config";
import type { Point } from "../core/targeting";

export interface ClientRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** 文字を大きくし始める舞台の幅（CSS px）．縦向きのスマートフォンは，これより狭い． */
const TEXT_BOOST_FROM_PX = 430;
/**
 * 文字を大きくする上限の倍率．利用者の文字の設定（rem）に掛けるため，
 * 文字の設定を 2 倍にすれば，どの舞台の幅でも画面の文字は 2 倍になる．
 */
const MAX_TEXT_BOOST = 1.5;

/**
 * 舞台の幅に応じた文字の倍率．大きな画面で文字が舞台に比べて小さく見えないようにする．
 * 縦向きのスマートフォンでは 1 倍のままとし，最大 1.5 倍にとどめる．
 */
export function textBoost(stageCssWidth: number): number {
  return Math.min(MAX_TEXT_BOOST, Math.max(1, stageCssWidth / TEXT_BOOST_FROM_PX));
}

/** window のうち，画素密度の見張りに使う部分． */
export interface PixelRatioSource {
  readonly devicePixelRatio: number;
  matchMedia(media: string): {
    addEventListener(type: "change", listener: () => void, options: { once: true }): void;
  };
}

/**
 * 画素密度の変化を知らせる．画素密度の違う画面へウィンドウを移したときなどに起きる．
 * CSS の大きさが変わらなければ ResizeObserver は呼ばれないため，media query で見張る．
 * 見張るのは今の画素密度だけのため，変わるたびに新しい値で見張り直す．
 */
export function watchPixelRatio(source: PixelRatioSource, onChange: () => void): void {
  const query = source.matchMedia(`(resolution: ${String(source.devicePixelRatio)}dppx)`);
  query.addEventListener(
    "change",
    () => {
      onChange();
      watchPixelRatio(source, onChange);
    },
    { once: true },
  );
}

/** 画面上の位置（CSS px）を論理座標へ変換する． */
export function toStagePoint(clientX: number, clientY: number, rect: ClientRect): Point {
  return {
    x: ((clientX - rect.left) * STAGE.width) / rect.width,
    y: ((clientY - rect.top) * STAGE.height) / rect.height,
  };
}
