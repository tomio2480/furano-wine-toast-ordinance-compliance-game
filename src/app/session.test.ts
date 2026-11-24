import { describe, expect, it } from "vitest";
import { FIRST_SPAWN_MS } from "../config";
import { PlaySession } from "./session";

function fakeClock(startMs = 1_000) {
  let now = startMs;
  return {
    now: () => now,
    tick: (ms: number) => {
      now += ms;
    },
  };
}

describe("PlaySession", () => {
  it("走らせていない間は時間が進まない", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    clock.tick(5_000);
    session.sync();
    expect(session.game.timeMs).toBe(0);
  });

  it("走らせると実時間の分だけ進む", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    session.run();
    clock.tick(500);
    session.sync();
    expect(session.game.timeMs).toBe(500);
  });

  it("一時停止中の時間は残り時間に数えない", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    session.run();
    clock.tick(500);
    session.halt();
    clock.tick(5_000);
    session.run();
    clock.tick(300);
    session.sync();
    expect(session.game.timeMs).toBe(800);
  });

  it("止めると乾杯の押下を解除する", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    session.run();
    session.setHeld(true);
    session.halt();
    expect(session.game.isHeld).toBe(false);
  });

  it("押下は現在の時刻まで進めてから反映する", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    session.run();
    clock.tick(200);
    session.setHeld(true);
    expect(session.game.timeMs).toBe(200);
    expect(session.game.isHeld).toBe(true);
  });

  it("投擲は現在の時刻まで進めてから判定する", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    session.run();
    clock.tick(FIRST_SPAWN_MS);
    session.throwAt(1);
    expect(session.game.hits).toBe(1);
  });

  it("新しいゲームを始めると状態を初期化する", () => {
    const clock = fakeClock();
    const session = new PlaySession(clock.now, () => 0);
    session.run();
    clock.tick(1_000);
    session.newGame();
    expect(session.game.timeMs).toBe(0);
    expect(session.isRunning).toBe(false);
  });
});
