import { EXIT_ANIMATION_MS, STAGE, type Row, type Slot } from "../config";
import type { Exit, GameState, Participant } from "../core/game";
import { findSlot, hitboxCenter, type Point } from "../core/targeting";
import { appearanceFor } from "./appearance";
import { drawBurst, drawKanpaiEffect, drawMiss, drawPopup, drawSnowball, drawWindowSnow } from "./effects";
import {
  CALM,
  exitPlacement,
  exitPopup,
  FULL_MOTION,
  progress,
  type MotionProfile,
  type Placement,
} from "./motion";
import type { Ctx } from "./paint";
import { drawPerson } from "./people";
import { paintBackground, paintTable } from "./scene";

interface Miss {
  readonly point: Point;
  readonly atMs: number;
}

const MISS_VISIBLE_MS = 500;

function slotOf(participant: Participant): Slot {
  const slot = findSlot(participant.slotId);
  if (slot === undefined) {
    throw new RangeError(`枠 ${participant.slotId} は存在しません`);
  }
  return slot;
}

function createLayer(width: number, height: number): HTMLCanvasElement {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  return layer;
}

function context2d(canvas: HTMLCanvasElement): Ctx {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("Canvas 2D の描画コンテキストを取得できません");
  }
  return ctx;
}

export class Renderer {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: Ctx;
  #profile: MotionProfile = FULL_MOTION;
  #background: HTMLCanvasElement;
  #table: HTMLCanvasElement;
  #scale = 1;
  #misses: Miss[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = context2d(canvas);
    this.#background = createLayer(1, 1);
    this.#table = createLayer(1, 1);
  }

  /** 動きを減らす設定が変わったら，次のフレームから演出を切り替える． */
  setMotion(profile: MotionProfile): void {
    this.#profile = profile;
  }

  /** 表示の大きさと画素密度に合わせて作り直す．背景は解像度に依存させない． */
  resize(cssWidth: number, devicePixelRatio: number): void {
    const width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
    const height = Math.round((width * STAGE.height) / STAGE.width);
    this.#canvas.width = width;
    this.#canvas.height = height;
    this.#scale = width / STAGE.width;
    this.#background = this.#paintLayer(paintBackground);
    this.#table = this.#paintLayer(paintTable);
  }

  addMiss(point: Point, atMs: number): void {
    this.#misses = [...this.#misses, { point, atMs }];
  }

  draw(game: GameState, frameMs: number): void {
    const ctx = this.#ctx;
    this.#misses = this.#misses.filter((miss) => game.timeMs - miss.atMs < MISS_VISIBLE_MS);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.#background, 0, 0);
    ctx.setTransform(this.#scale, 0, 0, this.#scale, 0, 0);
    drawWindowSnow(ctx, frameMs, this.#profile);
    this.#drawRow(game, "back");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.#table, 0, 0);
    ctx.setTransform(this.#scale, 0, 0, this.#scale, 0, 0);
    this.#drawRow(game, "front");
    this.#drawImpacts(game);
    drawKanpaiEffect(ctx, game, this.#profile);
  }

  #paintLayer(painter: (ctx: Ctx) => void): HTMLCanvasElement {
    const layer = createLayer(this.#canvas.width, this.#canvas.height);
    const ctx = context2d(layer);
    ctx.setTransform(this.#scale, 0, 0, this.#scale, 0, 0);
    painter(ctx);
    return layer;
  }

  #drawRow(game: GameState, row: Row): void {
    const inRow = (participant: Participant) => slotOf(participant).row === row;
    for (const participant of game.participants.filter(inRow)) {
      this.#drawParticipant(participant, this.#appearPlacement(participant, game.timeMs));
    }
    for (const exit of game.exits.filter((item) => inRow(item.participant))) {
      this.#drawParticipant(exit.participant, exitPlacement(exit, game.timeMs, this.#profile));
    }
  }

  #appearPlacement(participant: Participant, nowMs: number): Placement {
    const t = progress(nowMs, participant.appearedAtMs, this.#profile.appearMs);
    return { alpha: t, dx: 0, dy: (1 - t) * 12, pose: CALM };
  }

  #drawParticipant(participant: Participant, placement: Placement): void {
    const ctx = this.#ctx;
    const slot = slotOf(participant);
    ctx.save();
    ctx.globalAlpha = placement.alpha;
    ctx.translate(slot.x + placement.dx, slot.y + placement.dy);
    ctx.scale(slot.scale, slot.scale);
    drawPerson(ctx, appearanceFor(participant.id), participant.drink, placement.pose);
    ctx.restore();
  }

  #drawImpacts(game: GameState): void {
    for (const exit of game.exits) {
      this.#drawImpact(exit, game.timeMs);
    }
    for (const miss of this.#misses) {
      drawMiss(this.#ctx, miss.point, game.timeMs - miss.atMs, this.#profile);
    }
  }

  #drawImpact(exit: Exit, nowMs: number): void {
    const popup = exitPopup(exit);
    if (popup === undefined) {
      return;
    }
    const target = hitboxCenter(slotOf(exit.participant));
    const flight = progress(nowMs, exit.atMs, this.#profile.flightMs);
    if (flight < 1) {
      drawSnowball(this.#ctx, target, flight);
      return;
    }
    const after = progress(nowMs, exit.atMs + this.#profile.flightMs, EXIT_ANIMATION_MS - this.#profile.flightMs);
    drawBurst(this.#ctx, target, after, this.#profile);
    drawPopup(this.#ctx, popup, target, after, this.#profile);
  }
}
