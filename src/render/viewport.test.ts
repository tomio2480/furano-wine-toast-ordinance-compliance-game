import { describe, expect, it } from "vitest";
import { toStagePoint } from "./viewport";

describe("toStagePoint", () => {
  it("表示の大きさが論理座標と同じなら位置だけずらす", () => {
    const rect = { left: 10, top: 20, width: 360, height: 640 };
    expect(toStagePoint(190, 340, rect)).toEqual({ x: 180, y: 320 });
  });

  it("拡大表示されていれば論理座標へ縮める", () => {
    const rect = { left: 0, top: 0, width: 720, height: 1_280 };
    expect(toStagePoint(360, 640, rect)).toEqual({ x: 180, y: 320 });
  });
});
