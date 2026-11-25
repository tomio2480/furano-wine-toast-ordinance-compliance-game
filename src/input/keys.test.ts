import { describe, expect, it } from "vitest";
import { keyAction } from "./keys";

describe("keyAction", () => {
  it("Space は乾杯", () => {
    expect(keyAction("Space")).toEqual({ kind: "kanpai" });
  });

  it.each([
    ["Digit1", 1],
    ["Digit7", 7],
    ["Numpad4", 4],
  ])("%s は枠 %i へ投げる", (code, slotId) => {
    expect(keyAction(code)).toEqual({ kind: "throw", slotId });
  });

  it.each(["KeyP", "Escape"])("%s は一時停止", (code) => {
    expect(keyAction(code)).toEqual({ kind: "pause" });
  });

  it.each(["Digit8", "Digit0", "KeyA", "Enter"])("%s には割り当てがない", (code) => {
    expect(keyAction(code)).toBeUndefined();
  });
});
