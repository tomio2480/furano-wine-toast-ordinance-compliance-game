import { STAGE } from "../config";
import type { Point } from "../core/targeting";

export interface ClientRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** 画面上の位置（CSS px）を論理座標へ変換する． */
export function toStagePoint(clientX: number, clientY: number, rect: ClientRect): Point {
  return {
    x: ((clientX - rect.left) * STAGE.width) / rect.width,
    y: ((clientY - rect.top) * STAGE.height) / rect.height,
  };
}
