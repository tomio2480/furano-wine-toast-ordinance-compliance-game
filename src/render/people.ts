import type { DrinkId } from "../core/drinks";
import type { Appearance, Build, HairStyle, Outfit } from "./appearance";
import { drawDrink } from "./drinks";
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

// 参加者は原点を足もとの中央とし，高さ約 150 の範囲に描く．
// オリジナルの汎用的な人物とし，実在の人物や既存のキャラクターに似せない．

export interface Pose {
  /** 驚いた顔にするか．命中と誤射の退場で使う． */
  readonly surprised: boolean;
  /** 雪まみれの度合い（0〜1）． */
  readonly snow: number;
}

const BODY_WIDTH: Readonly<Record<Build, number>> = { slim: 30, regular: 36, broad: 44 };
const HEAD = { x: 0, y: -128, radius: 15 } as const;
const PANTS = "#2f3542";
const SHOES = "#1d1d22";

type Painter = (ctx: Ctx, look: Appearance, width: number) => void;

const noop: Painter = () => undefined;

function hairBob(ctx: Ctx, look: Appearance): void {
  fillRoundRect(ctx, -18, -146, 36, 30, 12, look.hair);
}

function hairLong(ctx: Ctx, look: Appearance): void {
  fillRoundRect(ctx, -18, -146, 36, 50, 12, look.hair);
}

/** 頭より後ろに描く髪． */
const HAIR_BACK: Readonly<Record<HairStyle, Painter>> = {
  short: noop,
  bob: hairBob,
  long: hairLong,
  bun: noop,
  cap: noop,
  shaved: noop,
};

function fringe(ctx: Ctx, look: Appearance): void {
  ctx.beginPath();
  ctx.ellipse(0, -134, 16, 11, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = look.hair;
  ctx.fill();
}

function bun(ctx: Ctx, look: Appearance): void {
  fringe(ctx, look);
  fillCircle(ctx, 0, -148, 7, look.hair);
}

function knitCap(ctx: Ctx, look: Appearance): void {
  ctx.beginPath();
  ctx.ellipse(0, -136, 17, 15, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = look.scarf;
  ctx.fill();
  fillRoundRect(ctx, -17, -139, 34, 6, 3, look.outfitColor);
  fillCircle(ctx, 0, -152, 4.5, look.outfitColor);
}

function shaved(ctx: Ctx, look: Appearance): void {
  ctx.beginPath();
  ctx.ellipse(0, -134, 15, 10, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.lineWidth = 2;
  ctx.strokeStyle = look.hair;
  ctx.stroke();
}

/** 頭より手前に描く髪や帽子． */
const HAIR_FRONT: Readonly<Record<HairStyle, Painter>> = {
  short: fringe,
  bob: fringe,
  long: fringe,
  bun,
  cap: knitCap,
  shaved,
};

function sweater(ctx: Ctx, _look: Appearance, width: number): void {
  for (const y of [-96, -86, -76]) {
    strokeLine(ctx, [-width / 2 + 3, y], [width / 2 - 3, y], 1.4, "rgb(255 255 255 / 30%)");
  }
}

function shirt(ctx: Ctx): void {
  polygon(ctx, [
    [-7, -110],
    [0, -101],
    [7, -110],
  ]);
  ctx.fillStyle = "#f7f4ec";
  ctx.fill();
  for (const y of [-96, -86, -76]) {
    fillCircle(ctx, 0, y, 1.3, "#f7f4ec");
  }
}

function jacket(ctx: Ctx, _look: Appearance, width: number): void {
  polygon(ctx, [
    [-6, -110],
    [0, -84],
    [6, -110],
  ]);
  ctx.fillStyle = "#f0ebe0";
  ctx.fill();
  strokeLine(ctx, [-6, -110], [-width / 2 + 6, -80], 1.6, "rgb(0 0 0 / 35%)");
  strokeLine(ctx, [6, -110], [width / 2 - 6, -80], 1.6, "rgb(0 0 0 / 35%)");
}

function hoodie(ctx: Ctx, _look: Appearance, width: number): void {
  fillRoundRect(ctx, -width / 4, -78, width / 2, 12, 4, "rgb(0 0 0 / 18%)");
  strokeLine(ctx, [-4, -108], [-4, -94], 1.4, "#f7f4ec");
  strokeLine(ctx, [4, -108], [4, -94], 1.4, "#f7f4ec");
}

function dress(ctx: Ctx, look: Appearance, width: number): void {
  polygon(ctx, [
    [-width / 2, -62],
    [width / 2, -62],
    [width / 2 + 8, -32],
    [-width / 2 - 8, -32],
  ]);
  ctx.fillStyle = look.outfitColor;
  ctx.fill();
  outline(ctx, 1.4);
}

const OUTFIT_DETAIL: Readonly<Record<Outfit, Painter>> = {
  sweater,
  shirt,
  jacket,
  hoodie,
  dress,
};

function legs(ctx: Ctx, width: number): void {
  const gap = width / 4;
  fillRoundRect(ctx, -gap - 5, -60, 10, 56, 3, PANTS);
  fillRoundRect(ctx, gap - 5, -60, 10, 56, 3, PANTS);
  fillRoundRect(ctx, -gap - 7, -6, 13, 6, 3, SHOES);
  fillRoundRect(ctx, gap - 6, -6, 13, 6, 3, SHOES);
}

function torso(ctx: Ctx, look: Appearance, width: number): void {
  fillRoundRect(ctx, -width / 2, -112, width, 58, 9, look.outfitColor);
  ctx.beginPath();
  ctx.roundRect(-width / 2, -112, width, 58, 9);
  outline(ctx, 1.4);
  OUTFIT_DETAIL[look.outfit](ctx, look, width);
}

function scarf(ctx: Ctx, look: Appearance, width: number): void {
  fillRoundRect(ctx, -width * 0.36, -116, width * 0.72, 9, 4, look.scarf);
  fillRoundRect(ctx, -width * 0.3, -110, 7, 20, 3, look.scarf);
}

function arms(ctx: Ctx, look: Appearance, width: number, drink: DrinkId): void {
  const shoulder = width / 2 - 4;
  strokeLine(ctx, [-shoulder, -104], [-shoulder - 4, -68], 8, look.outfitColor);
  fillCircle(ctx, -shoulder - 4, -66, 4.5, look.skin);
  strokeLine(ctx, [shoulder, -104], [21, -116], 8, look.outfitColor);
  ctx.save();
  ctx.translate(23, -104);
  drawDrink(ctx, drink);
  ctx.restore();
  fillCircle(ctx, 20, -114, 4.8, look.skin);
}

function face(ctx: Ctx, pose: Pose): void {
  fillCircle(ctx, -5.5, -129, 1.9, OUTLINE);
  fillCircle(ctx, 5.5, -129, 1.9, OUTLINE);
  fillCircle(ctx, -9, -123, 2.4, "rgb(240 120 120 / 45%)");
  fillCircle(ctx, 9, -123, 2.4, "rgb(240 120 120 / 45%)");
  if (pose.surprised) {
    fillEllipse(ctx, 0, -119, 3, 3.8, OUTLINE);
    strokeLine(ctx, [-8, -137], [-3, -138], 1.4, OUTLINE);
    strokeLine(ctx, [3, -138], [8, -137], 1.4, OUTLINE);
    return;
  }
  ctx.beginPath();
  ctx.arc(0, -123, 5, Math.PI * 0.2, Math.PI * 0.8);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

function head(ctx: Ctx, look: Appearance, pose: Pose): void {
  fillRoundRect(ctx, -4, -118, 8, 8, 2, look.skin);
  fillCircle(ctx, HEAD.x, HEAD.y, HEAD.radius, look.skin);
  ctx.beginPath();
  ctx.arc(HEAD.x, HEAD.y, HEAD.radius, 0, Math.PI * 2);
  outline(ctx, 1.4);
  face(ctx, pose);
}

const SNOW_SPOTS = [
  [-6, -146, 8],
  [8, -142, 7],
  [-12, -100, 9],
  [6, -88, 10],
  [-4, -70, 8],
  [14, -112, 7],
] as const;

function snow(ctx: Ctx, amount: number): void {
  ctx.globalAlpha *= amount;
  for (const [x, y, radius] of SNOW_SPOTS) {
    fillCircle(ctx, x, y, radius, "#fbfdff");
  }
}

export function drawPerson(ctx: Ctx, look: Appearance, drink: DrinkId, pose: Pose): void {
  const width = BODY_WIDTH[look.build];
  ctx.save();
  HAIR_BACK[look.hairStyle](ctx, look, width);
  legs(ctx, width);
  torso(ctx, look, width);
  scarf(ctx, look, width);
  head(ctx, look, pose);
  HAIR_FRONT[look.hairStyle](ctx, look, width);
  arms(ctx, look, width, drink);
  snow(ctx, pose.snow);
  ctx.restore();
}
