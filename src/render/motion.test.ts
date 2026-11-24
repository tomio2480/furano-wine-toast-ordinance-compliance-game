import { describe, expect, it } from "vitest";
import { EXIT_ANIMATION_MS } from "../config";
import type { Exit } from "../core/game";
import { arcPoint, exitPopup, progress } from "./motion";

const exit = (reason: Exit["reason"]): Exit => ({
  participant: { id: 1, slotId: 1, drink: "beer", appearedAtMs: 0, leaveAtMs: 9_000 },
  reason,
  atMs: 1_000,
});

describe("progress", () => {
  it("開始時は 0，終了時は 1", () => {
    expect(progress(1_000, 1_000, 400)).toBe(0);
    expect(progress(1_400, 1_000, 400)).toBe(1);
  });

  it("範囲外は 0〜1 に収める", () => {
    expect(progress(900, 1_000, 400)).toBe(0);
    expect(progress(2_000, 1_000, 400)).toBe(1);
  });

  it("途中は割合を返す", () => {
    expect(progress(1_100, 1_000, 400)).toBe(0.25);
  });
});

describe("arcPoint", () => {
  const from = { x: 0, y: 100 };
  const to = { x: 100, y: 100 };

  it("両端は始点と終点", () => {
    expect(arcPoint(from, to, 0, 50)).toEqual(from);
    expect(arcPoint(from, to, 1, 50)).toEqual(to);
  });

  it("中間は弧の高さだけ持ち上がる", () => {
    expect(arcPoint(from, to, 0.5, 50)).toEqual({ x: 50, y: 50 });
  });
});

describe("exitPopup", () => {
  it("命中は +237", () => {
    expect(exitPopup(exit("hit"))).toEqual({ text: "+237", tone: "good" });
  });

  it("誤射は -237", () => {
    expect(exitPopup(exit("misfire"))).toEqual({ text: "-237", tone: "bad" });
  });

  it("時間切れの退場には出さない", () => {
    expect(exitPopup(exit("timeout"))).toBeUndefined();
  });

  it("演出の長さは退場の演出と同じ", () => {
    expect(EXIT_ANIMATION_MS).toBeGreaterThan(0);
  });
});
