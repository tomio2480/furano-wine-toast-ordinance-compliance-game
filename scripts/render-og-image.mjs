// assets/og-image.svg から OGP 用の 1200 × 630 の PNG を作る．
// 得点ごとの画像は作らない（要件書の「SNS 共有」）．生成物は public/ に置いてコミットする．
// 文字の描画は実行環境のフォントに依存するため，日本語フォントのある環境で実行する．
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const SOURCE = fileURLToPath(new URL("../assets/og-image.svg", import.meta.url));
const OUTPUT = fileURLToPath(new URL("../public/og-image.png", import.meta.url));
const SIZE = { width: 1200, height: 630 };

const svg = await readFile(SOURCE, "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: SIZE });
await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`);
await page.screenshot({ path: OUTPUT });
await browser.close();
console.log(`wrote ${OUTPUT}`);
