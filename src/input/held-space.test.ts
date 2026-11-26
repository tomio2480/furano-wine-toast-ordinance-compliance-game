import { describe, expect, it } from "vitest";
import { HeldSpaceGuard } from "./held-space";

describe("HeldSpaceGuard", () => {
  it("乾杯に使った Space の繰り返しと離す操作は，メニューのボタンに渡さない", () => {
    const guard = new HeldSpaceGuard();
    guard.start();
    expect(guard.swallowsKeyDown(true)).toBe(true);
    expect(guard.swallowsKeyUp()).toBe(true);
  });

  it("離した後に押し直した Space は，メニューのボタンに渡す", () => {
    const guard = new HeldSpaceGuard();
    guard.start();
    guard.swallowsKeyUp();
    expect(guard.swallowsKeyDown(false)).toBe(false);
    expect(guard.swallowsKeyUp()).toBe(false);
  });

  it("離す操作を取りこぼしても，次に押し直した Space はボタンに渡す", () => {
    const guard = new HeldSpaceGuard();
    guard.start();
    expect(guard.swallowsKeyDown(false)).toBe(false);
    expect(guard.swallowsKeyUp()).toBe(false);
  });

  it("乾杯に使っていなければ，何も止めない", () => {
    const guard = new HeldSpaceGuard();
    expect(guard.swallowsKeyDown(true)).toBe(false);
    expect(guard.swallowsKeyUp()).toBe(false);
  });
});
