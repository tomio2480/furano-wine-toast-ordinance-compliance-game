import { describe, expect, it } from "vitest";
import { keyAction, yieldsToFocusedButton } from "./keys";

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

describe("yieldsToFocusedButton", () => {
  const KANPAI = { kind: "kanpai" } as const;
  const button = { tagName: "BUTTON" };

  it("乾杯以外のボタンに焦点があれば，Space はそのボタンの操作に譲る", () => {
    expect(yieldsToFocusedButton(KANPAI, button, false)).toBe(true);
  });

  it("乾杯ボタンに焦点があれば，Space で乾杯する", () => {
    expect(yieldsToFocusedButton(KANPAI, button, true)).toBe(false);
  });

  it("焦点がボタンでなければ，Space で乾杯する", () => {
    expect(yieldsToFocusedButton(KANPAI, { tagName: "BODY" }, false)).toBe(false);
    expect(yieldsToFocusedButton(KANPAI, null, false)).toBe(false);
  });

  it("数字キーと一時停止のキーは，焦点の位置にかかわらず働く", () => {
    expect(yieldsToFocusedButton({ kind: "throw", slotId: 1 }, button, false)).toBe(false);
    expect(yieldsToFocusedButton({ kind: "pause" }, button, false)).toBe(false);
  });
});
