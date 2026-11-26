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

/** 行に応じた塗りの色．上から下へ，palette を同じ幅の帯に分けて割り当てる． */
export function bandColor(row: number, top: number, bottom: number, palette: readonly string[]): string {
  const span = Math.max(1, bottom - top);
  const ratio = Math.min(1, Math.max(0, (row - top) / span));
  const index = Math.min(palette.length - 1, Math.floor(ratio * palette.length));
  return palette[index] ?? "#000";
}

/** 「#rgb」か「#rrggbb」の色を成分に分ける． */
function rgb(color: string): readonly [number, number, number] {
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  const channel = (start: number) => Number.parseInt(full.slice(start, start + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

export interface GlyphColors {
  /** 塗りの帯の色．上から下の順． */
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
function dotColor(layers: GlyphLayers, index: number, row: number, height: number, colors: GlyphColors) {
  if (layers.mask[index] === true) {
    return bandColor(row, 0, height - 1, colors.fill);
  }
  if (layers.edge[index] === true) {
    return colors.outline;
  }
  return layers.drop[index] === true ? colors.shadow : undefined;
}

/** 文字の形に，帯の塗り・縁・影を付けた RGBA の画素を作る．縁と影の外は透明のまま． */
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
    const color = dotColor(layers, index, Math.floor(index / width), height, colors);
    if (color !== undefined) {
      pixels.set([...rgb(color), OPAQUE], index * CHANNELS);
    }
  }
  return pixels;
}
