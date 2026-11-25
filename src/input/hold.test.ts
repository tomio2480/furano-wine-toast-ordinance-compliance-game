import { describe, expect, it } from "vitest";
import { HoldTracker } from "./hold";

describe("HoldTracker（H はタッチ・マウス・キーの論理和）", () => {
  it("どれか 1 つでも押されていれば押下中", () => {
    const hold = new HoldTracker();
    hold.press("key");
    expect(hold.isHeld).toBe(true);
  });

  it("すべて離すまで押下が続く", () => {
    const hold = new HoldTracker();
    hold.press("key");
    hold.press("pointer:3");
    hold.release("key");
    expect(hold.isHeld).toBe(true);
    hold.release("pointer:3");
    expect(hold.isHeld).toBe(false);
  });

  it("まとめて解除できる", () => {
    const hold = new HoldTracker();
    hold.press("key");
    hold.press("pointer:1");
    hold.releaseAll();
    expect(hold.isHeld).toBe(false);
  });

  it("押していないものを離しても押下中にならない", () => {
    const hold = new HoldTracker();
    hold.release("pointer:9");
    expect(hold.isHeld).toBe(false);
  });
});
