import { describe, expect, it } from "vitest";
import { nextScreen } from "./screen";

describe("画面遷移（図 1）", () => {
  it.each([
    ["title", "start", "countdown"],
    ["countdown", "countdownDone", "play"],
    ["play", "pause", "pause"],
    ["countdown", "pause", "pause"],
    ["pause", "resume", "countdown"],
    ["play", "timeUp", "result"],
    ["result", "retry", "countdown"],
    ["result", "toTitle", "title"],
  ] as const)("%s で %s なら %s へ", (from, event, to) => {
    expect(nextScreen(from, event)).toBe(to);
  });

  it.each([
    ["title", "pause"],
    ["pause", "timeUp"],
    ["result", "pause"],
    ["play", "start"],
  ] as const)("%s では %s を無視する", (from, event) => {
    expect(nextScreen(from, event)).toBe(from);
  });
});
