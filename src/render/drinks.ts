import type { DrinkId } from "../core/drinks";
import {
  OUTLINE,
  fillCircle,
  fillEllipse,
  fillRoundRect,
  outline,
  polygon,
  strokeLine,
  type Ctx,
} from "./paint";

// 飲み物は原点を底の中央とし，高さ約 46 の範囲に描く．
// 色だけに頼らず，器の形で適合（ワイングラスと果汁の小瓶）と不適合を見分けられるようにする．
// 実在の商品のラベルやロゴは描かない．

const GLASS = "rgb(235 245 250 / 55%)";
const GLASS_EDGE = "#f5fbff";
const OUTLINE_GLASS = "#3d3a3a";

function wineGlass(ctx: Ctx, liquid: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -44);
  ctx.quadraticCurveTo(-13, -22, 0, -20);
  ctx.quadraticCurveTo(13, -22, 12, -44);
  ctx.closePath();
  ctx.fillStyle = GLASS;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = liquid;
  ctx.fillRect(-14, -34, 28, 16);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-12, -44);
  ctx.quadraticCurveTo(-13, -22, 0, -20);
  ctx.quadraticCurveTo(13, -22, 12, -44);
  outline(ctx);
  strokeLine(ctx, [0, -20], [0, -4], 2.4, OUTLINE_GLASS);
  fillEllipse(ctx, 0, -3, 10, 3, GLASS_EDGE);
  ctx.beginPath();
  ctx.ellipse(0, -3, 10, 3, 0, 0, Math.PI * 2);
  outline(ctx, 1.2);
  strokeLine(ctx, [-7, -40], [-8, -30], 1.6, "rgb(255 255 255 / 85%)");
}

function grapeJuice(ctx: Ctx): void {
  const purple = "#5b2470";
  fillRoundRect(ctx, -15, -40, 12, 40, 3, purple);
  ctx.beginPath();
  ctx.roundRect(-15, -40, 12, 40, 3);
  outline(ctx);
  fillRoundRect(ctx, -13, -46, 8, 7, 2, "#d9c7a0");
  for (const [x, y] of [
    [-10, -24],
    [-7, -24],
    [-8.5, -21],
    [-11.5, -21],
    [-10, -18],
  ] as const) {
    fillCircle(ctx, x, y, 1.9, "#c9a6e0");
  }
  fillRoundRect(ctx, 0, -24, 15, 24, 2, GLASS);
  fillRoundRect(ctx, 1.5, -17, 12, 16, 1.5, purple);
  ctx.beginPath();
  ctx.roundRect(0, -24, 15, 24, 2);
  outline(ctx);
}

function beerMug(ctx: Ctx): void {
  fillRoundRect(ctx, -12, -36, 22, 36, 3, "#e9a72a");
  ctx.beginPath();
  ctx.roundRect(-12, -36, 22, 36, 3);
  outline(ctx, 2);
  ctx.beginPath();
  ctx.arc(12, -18, 7, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  for (const x of [-9, -3, 3, 8]) {
    fillCircle(ctx, x, -37, 5, "#fffdf5");
  }
  fillCircle(ctx, -4, -14, 1.5, "#fff3c4");
  fillCircle(ctx, 2, -22, 1.2, "#fff3c4");
}

function sakeMasu(ctx: Ctx): void {
  polygon(ctx, [
    [-14, -28],
    [14, -28],
    [12, 0],
    [-12, 0],
  ]);
  ctx.fillStyle = "#e7c98f";
  ctx.fill();
  outline(ctx, 2);
  polygon(ctx, [
    [-11, -27],
    [11, -27],
    [10, -23],
    [-10, -23],
  ]);
  ctx.fillStyle = "#dfeef5";
  ctx.fill();
  strokeLine(ctx, [-6, -18], [-5, -4], 1, "#b8955a");
  strokeLine(ctx, [5, -18], [4, -4], 1, "#b8955a");
}

function highball(ctx: Ctx): void {
  fillRoundRect(ctx, -8, -48, 16, 48, 2, GLASS);
  fillRoundRect(ctx, -7, -40, 14, 39, 1.5, "#f0cf6a");
  fillRoundRect(ctx, -5, -38, 7, 7, 1, "rgb(255 255 255 / 75%)");
  fillRoundRect(ctx, -1, -30, 6, 6, 1, "rgb(255 255 255 / 75%)");
  for (const [x, y] of [
    [-3, -20],
    [2, -14],
    [-2, -8],
    [3, -24],
  ] as const) {
    fillCircle(ctx, x, y, 1.3, "#fffbe8");
  }
  ctx.beginPath();
  ctx.roundRect(-8, -48, 16, 48, 2);
  outline(ctx);
}

function petBottle(ctx: Ctx): void {
  fillRoundRect(ctx, -4, -50, 8, 6, 1.5, "#e0802c");
  fillRoundRect(ctx, -5, -45, 10, 6, 2, "#c9b29a");
  fillRoundRect(ctx, -10, -40, 20, 40, 5, "#8a4a17");
  fillRoundRect(ctx, -10, -27, 20, 11, 0, "#efe6cf");
  ctx.beginPath();
  ctx.roundRect(-10, -40, 20, 40, 5);
  outline(ctx);
  strokeLine(ctx, [-6, -36], [-6, -30], 1.6, "rgb(255 255 255 / 55%)");
}

function colaCan(ctx: Ctx): void {
  fillRoundRect(ctx, -10, -34, 20, 34, 3, "#3b1713");
  fillRoundRect(ctx, -10, -24, 20, 6, 0, "#d8d8d8");
  fillEllipse(ctx, 0, -34, 10, 3, "#c8cdd2");
  ctx.beginPath();
  ctx.roundRect(-10, -34, 20, 34, 3);
  outline(ctx);
  strokeLine(ctx, [-6, -30], [-6, -27], 1.6, "rgb(255 255 255 / 45%)");
  strokeLine(ctx, [-6, -15], [-6, -5], 1.6, "rgb(255 255 255 / 25%)");
}

function coffeeMug(ctx: Ctx): void {
  ctx.beginPath();
  ctx.arc(11, -14, 6.5, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  fillRoundRect(ctx, -12, -28, 22, 28, 4, "#f3ede1");
  ctx.beginPath();
  ctx.roundRect(-12, -28, 22, 28, 4);
  outline(ctx, 2);
  fillEllipse(ctx, -1, -26, 9, 2.4, "#5a3218");
  for (const x of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(x, -32);
    ctx.bezierCurveTo(x - 4, -37, x + 4, -41, x, -47);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "rgb(255 255 255 / 85%)";
    ctx.stroke();
  }
}

const DRINK_PAINTERS: Readonly<Record<DrinkId, (ctx: Ctx) => void>> = {
  wineRed: (ctx) => {
    wineGlass(ctx, "#7a0f2b");
  },
  wineWhite: (ctx) => {
    wineGlass(ctx, "#f1dc7a");
  },
  wineRose: (ctx) => {
    wineGlass(ctx, "#f08aa6");
  },
  grapeJuice,
  beer: beerMug,
  sake: sakeMasu,
  highball,
  oolongTea: petBottle,
  cola: colaCan,
  hotCoffee: coffeeMug,
};

export function drawDrink(ctx: Ctx, drink: DrinkId): void {
  DRINK_PAINTERS[drink](ctx);
}
