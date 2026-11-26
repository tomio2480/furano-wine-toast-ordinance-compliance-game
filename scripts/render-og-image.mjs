// assets/og-image.svg から OGP 用の 1200 × 630 の PNG を作る．
// 得点ごとの画像は作らない（要件書の「SNS 共有」）．生成物は public/ に置いてコミットする．
// 文字の描画は実行環境のフォントに依存するため，日本語フォントのある環境で実行する．
//
// タイトル画面と同じく 1990〜2000 年代の画像に見せるため，次の順で描く．
// 1. 半分の大きさ（600 × 315）で描く
// 2. 色をウェブセーフカラー（各成分 0x33 刻み）に丸める．src/render/pixel-art.ts の toWebSafe と同じ計算
// 3. なめらかにせず 2 倍に拡大し，ドットを見せる
//
// page.evaluate に渡す関数はブラウザの中で動くため，ブラウザの値を使う．
/* global document, Image */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const SOURCE = fileURLToPath(new URL("../assets/og-image.svg", import.meta.url));
const OUTPUT = fileURLToPath(new URL("../public/og-image.png", import.meta.url));
const SIZE = { width: 1200, height: 630 };
/** 縮めて描く倍率．拡大したときの 1 ドットの大きさ（px）になる． */
const DOT = 2;

const svg = await readFile(SOURCE, "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: SIZE });
await page.setContent("<!doctype html><body style=\"margin:0\"></body>");
const png = await page.evaluate(
  async ({ source, width, height, dot }) => {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    await image.decode();
    const small = document.createElement("canvas");
    small.width = width / dot;
    small.height = height / dot;
    const smallCtx = small.getContext("2d");
    smallCtx.drawImage(image, 0, 0, small.width, small.height);
    const pixels = smallCtx.getImageData(0, 0, small.width, small.height);
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      for (let channel = 0; channel < 3; channel++) {
        pixels.data[offset + channel] = Math.round(pixels.data[offset + channel] / 51) * 51;
      }
      pixels.data[offset + 3] = 255;
    }
    smallCtx.putImageData(pixels, 0, 0);
    const large = document.createElement("canvas");
    large.width = width;
    large.height = height;
    const largeCtx = large.getContext("2d");
    largeCtx.imageSmoothingEnabled = false;
    largeCtx.drawImage(small, 0, 0, width, height);
    return large.toDataURL("image/png").split(",")[1];
  },
  { source: svg, width: SIZE.width, height: SIZE.height, dot: DOT },
);
await writeFile(OUTPUT, Buffer.from(png, "base64"));
await browser.close();
console.log(`wrote ${OUTPUT}`);
