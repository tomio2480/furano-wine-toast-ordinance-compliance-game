// 1990〜2000 年代の GIF のような，色数の少ないドット絵を作る道具．
// 形は真偽値の配列（横 width × 縦 height，左上から行ごと）で表す．

/** ウェブセーフカラーの刻み（0x33）． */
const WEB_SAFE_STEP = 51;
const OPAQUE_THRESHOLD = 128;
const CHANNELS = 4;
const OPAQUE = 255;

/** 0〜255 の色の成分を，ウェブセーフカラーの最も近い値に丸める． */
export function toWebSafe(channel: number): number {
  return Math.round(channel / WEB_SAFE_STEP) * WEB_SAFE_STEP;
}

/** 不透明度から「描く・描かない」の形を作る．GIF の透明は 1 色だけのため，半透明は残さない． */
export function binarize(alpha: ArrayLike<number>, threshold = OPAQUE_THRESHOLD): boolean[] {
  return Array.from(alpha, (value) => value >= threshold);
}

const NEIGHBORS = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const));

function isSet(mask: readonly boolean[], width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === true;
}

/** 形を囲む 1 ドットの縁（斜めも含む）．形そのものは含めない． */
export function outline(mask: readonly boolean[], width: number, height: number): boolean[] {
  return mask.map((filled, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return !filled && NEIGHBORS.some(([dx, dy]) => isSet(mask, width, height, x + dx, y + dy));
  });
}

/** 形と縁を右下へずらした影．形と縁に重なるところは含めない． */
export function shadow(
  mask: readonly boolean[],
  edge: readonly boolean[],
  width: number,
  height: number,
  offset = 1,
): boolean[] {
  const body = mask.map((filled, index) => filled || edge[index] === true);
  return body.map((covered, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return !covered && isSet(body, width, height, x - offset, y - offset);
  });
}

/**
 * 4 × 4 の Bayer 行列．点描（組織的ディザ）で，どのドットを次の色にするかの順番を決める．
 * 隣り合うドットの値を離し，同じ色の点が固まらないようにしてある．
 */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;
const BAYER_SIZE = 4;
const BAYER_LEVELS = BAYER_SIZE * BAYER_SIZE;

/** ドットの位置に対応する Bayer 行列の値（0〜15）．4 ドットごとに繰り返す． */
export function bayer(x: number, y: number): number {
  return BAYER_4X4[y % BAYER_SIZE]?.[x % BAYER_SIZE] ?? 0;
}

/**
 * 上から下へ palette の色を移り変わらせるときの，ドットの色．
 * 隣り合う 2 色の間は，Bayer 行列の順に点を置き換えて混ぜる（ドット絵のグラデーション）．
 */
export function ditherColor(x: number, y: number, row: number, height: number, palette: readonly string[]): string {
  const last = palette.length - 1;
  const ratio = Math.min(1, Math.max(0, row / Math.max(1, height - 1)));
  const position = ratio * last;
  const index = Math.min(last, Math.floor(position));
  const threshold = (bayer(x, y) + 0.5) / BAYER_LEVELS;
  const color = position - index > threshold ? palette[index + 1] : palette[index];
  return color ?? palette[last] ?? "#000";
}

/** 「#rgb」か「#rrggbb」の色を成分に分ける． */
function rgb(color: string): readonly [number, number, number] {
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  const channel = (start: number) => Number.parseInt(full.slice(start, start + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

export interface GlyphColors {
  /** 塗りのグラデーションの色．上から下の順に，点描で移り変わらせる． */
  readonly fill: readonly string[];
  readonly outline: string;
  readonly shadow: string;
}

interface GlyphLayers {
  readonly mask: readonly boolean[];
  readonly edge: readonly boolean[];
  readonly drop: readonly boolean[];
}

/** ドットの色．塗り・縁・影の順に重ね，どれでもなければ透明（undefined）． */
function dotColor(layers: GlyphLayers, index: number, width: number, height: number, colors: GlyphColors) {
  if (layers.mask[index] === true) {
    const x = index % width;
    const y = Math.floor(index / width);
    return ditherColor(x, y, y, height, colors.fill);
  }
  if (layers.edge[index] === true) {
    return colors.outline;
  }
  return layers.drop[index] === true ? colors.shadow : undefined;
}

/** 文字の形に，点描のグラデーションの塗り・縁・影を付けた RGBA の画素を作る．縁と影の外は透明のまま． */
export function paintGlyph(
  mask: readonly boolean[],
  width: number,
  height: number,
  colors: GlyphColors,
): Uint8ClampedArray<ArrayBuffer> {
  const edge = outline(mask, width, height);
  const layers: GlyphLayers = { mask, edge, drop: shadow(mask, edge, width, height) };
  const pixels = new Uint8ClampedArray(width * height * CHANNELS);
  for (let index = 0; index < mask.length; index++) {
    const color = dotColor(layers, index, width, height, colors);
    if (color !== undefined) {
      pixels.set([...rgb(color), OPAQUE], index * CHANNELS);
    }
  }
  return pixels;
}
