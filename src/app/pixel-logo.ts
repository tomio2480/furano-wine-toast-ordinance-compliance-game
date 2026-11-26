import { binarize, paintGlyph, type GlyphColors } from "../render/pixel-art";

// タイトルの題字を，1990〜2000 年代の GIF のようなドット絵にする．
// 1 文字ずつ小さな画像に描き，CSS で整数倍に拡大してドットを見せる．
// 文字ごとに分けるのは，CSS のアニメーションで 1 文字ずつ波打たせるためである．
// 題字はロゴのため，画像の文字でもよい（WCAG 1.4.5 の例外）．読み上げには元の文字を使う．

/** 題字を描く文字の大きさ（ドット）．縦向きのスマートフォンでも 2 倍に拡大できる大きさにする． */
const GLYPH_FONT_PX = 14;
const FONT = `900 ${String(GLYPH_FONT_PX)}px "MS PGothic", "ＭＳ Ｐゴシック", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
/** 縁と影を描く分の余白（ドット）． */
const PAD = { left: 1, right: 2, top: 1, bottom: 2 } as const;
const CHANNELS = 4;
const ALPHA = 3;

/** ウェブセーフカラーだけで塗る．上から下へ黄色から橙へ帯で変える． */
const LOGO_COLORS: GlyphColors = {
  fill: ["#ffff99", "#ffff33", "#ffcc00", "#ff9900", "#ff6600"],
  outline: "#330000",
  shadow: "#000000",
};

interface Glyph {
  readonly canvas: HTMLCanvasElement;
  /** 文字の送り幅（ドット）．縁と影の余白は隣の文字に重ねるため含めない． */
  readonly advance: number;
}

function glyph(doc: Document, char: string, index: number): Glyph | undefined {
  const canvas = doc.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    return undefined;
  }
  ctx.font = FONT;
  const advance = Math.ceil(ctx.measureText(char).width);
  const width = advance + PAD.left + PAD.right;
  const height = GLYPH_FONT_PX + PAD.top + PAD.bottom;
  canvas.width = width;
  canvas.height = height;
  // 大きさを変えると描画の設定が戻るため，設定し直す．
  ctx.font = FONT;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";
  ctx.fillText(char, PAD.left, PAD.top);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const alpha = rgba.filter((_, offset) => offset % CHANNELS === ALPHA);
  ctx.putImageData(new ImageData(paintGlyph(binarize(alpha), width, height, LOGO_COLORS), width, height), 0, 0);
  canvas.style.setProperty("--cw", String(width));
  canvas.style.setProperty("--ch", String(height));
  canvas.style.setProperty("--i", String(index));
  return { canvas, advance };
}

/**
 * 見出しの文字をドット絵の題字に置き換えて見せる．見出しの文字は読み上げ用に残す．
 * 描けない環境では何もせず，CSS の飾り文字のままにする．
 */
export function mountPixelLogo(heading: HTMLElement): void {
  const doc = heading.ownerDocument;
  const text = heading.textContent.trim();
  const chars = Array.from(new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(text), (part) => part.segment);
  const glyphs = chars.map((char, index) => glyph(doc, char, index));
  if (glyphs.length === 0 || glyphs.some((item) => item === undefined)) {
    return;
  }
  const drawn = glyphs.filter((item) => item !== undefined);
  const logo = doc.createElement("span");
  logo.className = "pixel-logo";
  logo.setAttribute("aria-hidden", "true");
  logo.append(...drawn.map((item) => item.canvas));
  const advances = drawn.reduce((sum, item) => sum + item.advance, 0);
  logo.style.setProperty("--art-w", String(advances + PAD.left + PAD.right));
  logo.style.setProperty("--overlap", String(PAD.left + PAD.right));
  heading.append(logo);
  heading.classList.add("has-pixel-logo");
}

/**
 * 止まった GIF 風の動きを，マウスを載せたり触れたりしたときにもう一度流す．
 * CSS のアニメーションを外して描き直させ，付け直すことで最初から流す．
 */
export function replayOnPointer(trigger: HTMLElement, targets: () => Iterable<HTMLElement>): void {
  trigger.addEventListener("pointerenter", () => {
    for (const target of targets()) {
      target.style.animation = "none";
      target.getBoundingClientRect();
      target.style.removeProperty("animation");
    }
  });
}
