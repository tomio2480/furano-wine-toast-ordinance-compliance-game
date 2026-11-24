// Canvas の描画を短く書くための補助．どれも分岐を持たない．
export type Ctx = CanvasRenderingContext2D;

export const OUTLINE = "#2a1d18";

export function fillCircle(ctx: Ctx, x: number, y: number, radius: number, color: string): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function fillEllipse(
  ctx: Ctx,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function fillRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeLine(
  ctx: Ctx,
  from: readonly [number, number],
  to: readonly [number, number],
  width: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.stroke();
}

/** 直前に作ったパスへ輪郭線を引く． */
export function outline(ctx: Ctx, width = 1.6, color = OUTLINE): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function polygon(ctx: Ctx, points: readonly (readonly [number, number])[]): void {
  ctx.beginPath();
  for (const [x, y] of points) {
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}
