import { KANPAI_UNIT_SCORE, STAGE } from "../config";
import type { GameState } from "../core/game";
import type { KanpaiMode } from "../core/score";
import type { Point } from "../core/targeting";
import { drawDrink } from "./drinks";
import {
  arcPoint,
  burstRadius,
  kanpaiPopupPhase,
  progress,
  warningAlpha,
  type MotionProfile,
  type Popup,
} from "./motion";
import { fillCircle, type Ctx } from "./paint";
import { WINDOW_VIEW } from "./scene";

export const SNOWBALL_ORIGIN: Point = { x: STAGE.width / 2, y: 612 };
const ARC_HEIGHT = 70;
const BURST_MS = 300;

export function drawSnowball(ctx: Ctx, target: Point, t: number): void {
  const at = arcPoint(SNOWBALL_ORIGIN, target, t, ARC_HEIGHT);
  fillCircle(ctx, at.x, at.y, 7, "#8fa3b8");
  fillCircle(ctx, at.x - 0.8, at.y - 0.8, 6, "#fbfdff");
}

export function drawBurst(ctx: Ctx, center: Point, t: number, profile: MotionProfile): void {
  ctx.save();
  ctx.globalAlpha = 1 - t;
  for (let i = 0; i < profile.particles; i++) {
    const angle = (Math.PI * 2 * i) / profile.particles;
    const distance = 6 + t * 26;
    fillCircle(ctx, center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance, 3.2, "#fbfdff");
  }
  fillCircle(ctx, center.x, center.y, burstRadius(t, profile), "#fbfdff");
  ctx.restore();
}

const POPUP_COLORS: Readonly<Record<Popup["tone"], string>> = {
  good: "#ffe08a",
  bad: "#ff9a8f",
};

export function drawPopup(ctx: Ctx, popup: Popup, at: Point, t: number, profile: MotionProfile): void {
  ctx.save();
  ctx.globalAlpha = 1 - t * 0.8;
  ctx.font = "800 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#1a1220";
  const y = at.y - t * profile.popupRise;
  ctx.strokeText(popup.text, at.x, y);
  ctx.fillStyle = POPUP_COLORS[popup.tone];
  ctx.fillText(popup.text, at.x, y);
  ctx.restore();
}

/** 外れた雪玉は押した位置まで飛び，そこで散る． */
export function drawMiss(ctx: Ctx, point: Point, elapsedMs: number, profile: MotionProfile): void {
  const flight = progress(elapsedMs, 0, profile.flightMs);
  if (flight < 1) {
    drawSnowball(ctx, point, flight);
    return;
  }
  drawBurst(ctx, point, progress(elapsedMs, profile.flightMs, BURST_MS), profile);
}

interface Flake {
  readonly x: number;
  readonly y: number;
  readonly speed: number;
  readonly radius: number;
}

const GOLDEN_RATIO = 0.618_034;
const FLAKES: readonly Flake[] = Array.from({ length: 40 }, (_, i) => ({
  x: (i * GOLDEN_RATIO) % 1,
  y: (i * 0.377) % 1,
  speed: 10 + (i % 5) * 5,
  radius: 0.9 + (i % 3) * 0.5,
}));

/** 窓の外の降雪．室内に雪は降らせない． */
export function drawWindowSnow(ctx: Ctx, frameMs: number, profile: MotionProfile): void {
  const { x, y, width, height } = WINDOW_VIEW;
  const seconds = (frameMs / 1_000) * profile.snowSpeed;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  for (const flake of FLAKES) {
    const fx = x + ((flake.x * width + Math.sin(seconds + flake.y * 6) * 6) % width);
    const fy = y + ((flake.y * height + seconds * flake.speed) % height);
    fillCircle(ctx, fx, fy, flake.radius, "rgb(255 255 255 / 90%)");
  }
  ctx.restore();
}

const GLASSES_AT: Point = { x: 52, y: 628 };
const KANPAI_POPUP_AT: Point = { x: 312, y: 600 };

function clink(ctx: Ctx, game: GameState, profile: MotionProfile): void {
  const elapsed = game.timeMs - game.meter.startedAtMs;
  const swing = Math.sin(elapsed / 60) * profile.swing;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(GLASSES_AT.x + side * 13, GLASSES_AT.y);
    ctx.rotate(-side * (0.28 + swing));
    drawDrink(ctx, "wineRed");
    ctx.restore();
  }
  kanpaiPopup(ctx, elapsed, { text: KANPAI_UNIT_SCORE.plus.label, tone: "good" }, profile);
}

function warning(ctx: Ctx, game: GameState, profile: MotionProfile): void {
  const elapsed = game.timeMs - game.meter.startedAtMs;
  ctx.save();
  ctx.globalAlpha = warningAlpha(elapsed, profile);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#e53935";
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(5, 5, STAGE.width - 10, STAGE.height - 10);
  ctx.restore();
  kanpaiPopup(ctx, elapsed, { text: KANPAI_UNIT_SCORE.minus.label, tone: "bad" }, profile);
}

function kanpaiPopup(ctx: Ctx, elapsedMs: number, popup: Popup, profile: MotionProfile): void {
  drawPopup(ctx, popup, KANPAI_POPUP_AT, kanpaiPopupPhase(elapsedMs, profile), profile);
}

const KANPAI_EFFECTS: Readonly<
  Record<KanpaiMode, (ctx: Ctx, game: GameState, profile: MotionProfile) => void>
> = {
  plus: clink,
  minus: warning,
  neutral: () => undefined,
};

/** 加点中はグラスが触れ合い，減点中は画面の縁で警告する． */
export function drawKanpaiEffect(ctx: Ctx, game: GameState, profile: MotionProfile): void {
  KANPAI_EFFECTS[game.meter.mode](ctx, game, profile);
}
