import { SLOTS, STAGE, TABLE } from "../config";
import { fillCircle, fillEllipse, fillRoundRect, strokeLine, type Ctx } from "./paint";

// 会場の背景（要件書の表 9）．写真のトレースではないオリジナルの絵とし，
// 施設のロゴ・看板・店名は描かない．座標は論理座標（360 × 640）である．

const CEILING_BOTTOM = 64;
const WALL_BOTTOM = 300;
const TABLE_TOP = TABLE.top;
const LIGHT_XS = [60, 140, 220, 300] as const;

/** 窓のうち，外の雪景色が見える範囲．ブラインドの下端から窓の下端まで． */
export const WINDOW_VIEW = { x: 30, y: 118, width: 300, height: 144 } as const;

const WOOD_LIGHT = "#e9d4a8";
const WOOD_GRAIN = "#d2b583";

function ceiling(ctx: Ctx): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CEILING_BOTTOM);
  gradient.addColorStop(0, "#a3a19b");
  gradient.addColorStop(1, "#8d8b85");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STAGE.width, CEILING_BOTTOM);
  for (let x = 0; x <= STAGE.width; x += 90) {
    strokeLine(ctx, [x, 0], [x, CEILING_BOTTOM], 1, "rgb(60 60 60 / 30%)");
  }
  strokeLine(ctx, [0, 32], [STAGE.width, 32], 1, "rgb(60 60 60 / 25%)");
  for (let x = 22; x < STAGE.width; x += 45) {
    fillCircle(ctx, x, 16, 1.6, "rgb(50 50 50 / 45%)");
    fillCircle(ctx, x, 48, 1.6, "rgb(50 50 50 / 45%)");
  }
}

function wall(ctx: Ctx): void {
  ctx.fillStyle = "#1c2742";
  ctx.fillRect(0, CEILING_BOTTOM, STAGE.width, WALL_BOTTOM - CEILING_BOTTOM);
}

function outsideView(ctx: Ctx): void {
  const { x, y, width, height } = WINDOW_VIEW;
  const sky = ctx.createLinearGradient(0, y, 0, y + height);
  sky.addColorStop(0, "#2a3b63");
  sky.addColorStop(1, "#6d7fa8");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, width, height);
  ctx.beginPath();
  ctx.moveTo(x, y + 96);
  ctx.quadraticCurveTo(x + 80, y + 60, x + 160, y + 88);
  ctx.quadraticCurveTo(x + 230, y + 66, x + width, y + 84);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.fillStyle = "#c9d6ea";
  ctx.fill();
  for (const treeX of [x + 40, x + 70, x + 220, x + 262]) {
    pineTree(ctx, treeX, y + 112);
  }
  ctx.fillStyle = "#f4f7fc";
  ctx.fillRect(x, y + 118, width, height - 118);
}

function pineTree(ctx: Ctx, x: number, baseY: number): void {
  ctx.beginPath();
  ctx.moveTo(x, baseY - 40);
  ctx.lineTo(x + 13, baseY);
  ctx.lineTo(x - 13, baseY);
  ctx.closePath();
  ctx.fillStyle = "#294a43";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, baseY - 40);
  ctx.lineTo(x + 6, baseY - 22);
  ctx.lineTo(x - 6, baseY - 22);
  ctx.closePath();
  ctx.fillStyle = "#eef3fa";
  ctx.fill();
}

function windowFrame(ctx: Ctx): void {
  const { x, y, width, height } = WINDOW_VIEW;
  const top = y - 26;
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(x, top, width, 26);
  for (let slatY = top + 4; slatY < y; slatY += 5) {
    strokeLine(ctx, [x, slatY], [x + width, slatY], 0.8, "rgb(150 150 150 / 60%)");
  }
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#e8e6df";
  ctx.strokeRect(x, top, width, height + 26);
  for (const mullionX of [x + width / 3, x + (width * 2) / 3]) {
    strokeLine(ctx, [mullionX, y], [mullionX, y + height], 4, "#e8e6df");
  }
}

function woodFrame(ctx: Ctx): void {
  fillRoundRect(ctx, 8, CEILING_BOTTOM, 14, TABLE_TOP - CEILING_BOTTOM, 2, WOOD_LIGHT);
  fillRoundRect(ctx, STAGE.width - 22, CEILING_BOTTOM, 14, TABLE_TOP - CEILING_BOTTOM, 2, WOOD_LIGHT);
  fillRoundRect(ctx, 0, CEILING_BOTTOM, STAGE.width, 14, 2, WOOD_LIGHT);
  strokeLine(ctx, [0, CEILING_BOTTOM + 10], [STAGE.width, CEILING_BOTTOM + 10], 1, WOOD_GRAIN);
  strokeLine(ctx, [15, CEILING_BOTTOM + 16], [15, TABLE_TOP], 1, WOOD_GRAIN);
  strokeLine(ctx, [STAGE.width - 15, CEILING_BOTTOM + 16], [STAGE.width - 15, TABLE_TOP], 1, WOOD_GRAIN);
}

function pendantLight(ctx: Ctx, x: number): void {
  const glow = ctx.createRadialGradient(x, 96, 4, x, 96, 70);
  glow.addColorStop(0, "rgb(255 214 150 / 55%)");
  glow.addColorStop(1, "rgb(255 214 150 / 0%)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 70, 80, 140, 100);
  strokeLine(ctx, [x, 0], [x, 72], 1.2, "#3a3330");
  ctx.beginPath();
  ctx.ellipse(x, 90, 18, 18, 0, Math.PI, Math.PI * 2);
  const copper = ctx.createLinearGradient(x - 18, 72, x + 18, 90);
  copper.addColorStop(0, "#d98b52");
  copper.addColorStop(1, "#7a3e1c");
  ctx.fillStyle = copper;
  ctx.fill();
  fillEllipse(ctx, x, 91, 9, 3, "#fff1c9");
}

function floor(ctx: Ctx): void {
  ctx.fillStyle = "#d7b688";
  ctx.fillRect(0, WALL_BOTTOM, STAGE.width, STAGE.height - WALL_BOTTOM);
  for (let y = WALL_BOTTOM + 8, gap = 8; y < STAGE.height; gap += 3, y += gap) {
    strokeLine(ctx, [0, y], [STAGE.width, y], 1, "rgb(140 100 60 / 35%)");
  }
  fillRoundRect(ctx, 0, WALL_BOTTOM - 6, STAGE.width, 6, 0, "#14203a");
}

/** 窓の外の降雪以外の，動かない背景． */
export function paintBackground(ctx: Ctx): void {
  ceiling(ctx);
  wall(ctx);
  outsideView(ctx);
  windowFrame(ctx);
  woodFrame(ctx);
  floor(ctx);
  for (const x of LIGHT_XS) {
    pendantLight(ctx, x);
  }
}

const CHAIR = "#4a2a1a";
const CHAIR_LIGHT = "#6b4430";
/** 椅子は手前の列の人の間に置き，人に隠れすぎないようにする． */
const CHAIR_XS = [126, 234] as const;

/**
 * テーブルの下に押し込んだ濃茶の曲木風の椅子．背もたれをこちらへ向け，
 * 背もたれの輪の上端が幕板のすぐ下に来る．
 */
function chair(ctx: Ctx, x: number): void {
  const top = TABLE.apronBottom + 4;
  for (const side of [-1, 1]) {
    strokeLine(ctx, [x + side * 9, top + 46], [x + side * 9, top + 66], 2.4, CHAIR);
  }
  ctx.beginPath();
  ctx.ellipse(x, top + 64, 13, 3, 0, 0, Math.PI * 2);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = CHAIR;
  ctx.stroke();
  fillRoundRect(ctx, x - 17, top + 42, 34, 6, 3, CHAIR_LIGHT);
  ctx.beginPath();
  ctx.moveTo(x - 13, top + 72);
  ctx.lineTo(x - 13, top + 16);
  ctx.ellipse(x, top + 16, 13, 16, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(x + 13, top + 72);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = CHAIR;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, top + 42);
  ctx.lineTo(x - 7, top + 22);
  ctx.ellipse(x, top + 22, 7, 10, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(x + 7, top + 42);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function plate(ctx: Ctx, x: number, food: string): void {
  fillEllipse(ctx, x, TABLE_TOP - 2, 15, 4, "#f7f4ee");
  fillEllipse(ctx, x, TABLE_TOP - 4, 8, 3, food);
}

function slotTag(ctx: Ctx, x: number, y: number, label: string): void {
  fillRoundRect(ctx, x - 7, y - 7, 14, 14, 4, "rgb(15 22 38 / 72%)");
  ctx.fillStyle = "#f7f3ea";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.5);
}

/**
 * 奥の列より手前，手前の列より奥に描く長テーブル．
 * 濃い木目の天板と幕板で奥の列の足もとを隠し，白木の脚で支える．
 * 下には椅子を押し込み，数字キーの枠番号も添える．
 */
export function paintTable(ctx: Ctx): void {
  const width = STAGE.width - 16;
  for (const x of CHAIR_XS) {
    chair(ctx, x);
  }
  fillRoundRect(ctx, 26, TABLE.apronBottom - 4, 9, 64, 2, WOOD_LIGHT);
  fillRoundRect(ctx, STAGE.width - 35, TABLE.apronBottom - 4, 9, 64, 2, WOOD_LIGHT);
  fillRoundRect(ctx, 8, TABLE_TOP - 2, width, 9, 2, "#6b4430");
  fillRoundRect(ctx, 8, TABLE_TOP + 7, width, TABLE.apronBottom - TABLE_TOP - 7, 2, "#4a2d1f");
  for (const y of [TABLE_TOP + 16, TABLE_TOP + 25]) {
    strokeLine(ctx, [14, y], [STAGE.width - 14, y], 1, "rgb(120 80 50 / 55%)");
  }
  plate(ctx, 96, "#f2d36b");
  plate(ctx, 180, "#7b3f8c");
  plate(ctx, 264, "#c9773a");
  for (const slot of SLOTS) {
    slotTag(ctx, slot.x, slot.row === "back" ? TABLE.apronBottom - 12 : slot.y + 12, String(slot.id));
  }
}
