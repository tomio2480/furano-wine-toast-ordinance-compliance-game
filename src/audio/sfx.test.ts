import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "./sfx";

/** 効果音の合成に必要な分だけを持つ AudioContext の代役． */
function fakeContext() {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = <T extends object>(extra: T) => ({ ...extra, connect: (target: unknown) => target });
  return {
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    createOscillator: () => node({ type: "sine", frequency: param(), start: vi.fn(), stop: vi.fn() }),
    createGain: () => node({ gain: param() }),
  };
}

function setup() {
  const context = fakeContext();
  const create = vi.fn(() => context as unknown as AudioContext);
  return { context, create, sfx: new Sfx(create) };
}

/** 終了音は 0.3 秒後に始まる 0.32 秒の音で終わる． */
const END_SOUND_MS = 620;

describe("Sfx の一時停止", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("開始操作の前は，止める対象を作らない", () => {
    const { create, sfx } = setup();
    sfx.suspendWhenIdle();
    vi.runAllTimers();
    expect(create).not.toHaveBeenCalled();
  });

  it("鳴っている音がなければ，すぐに止める", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(0);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  it("鳴っている音が終わるまで待ってから止める", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.play("end");
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(END_SOUND_MS - 1);
    expect(context.suspend).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  it("止める前に開始操作があれば，止める予定を取り消す", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.play("end");
    sfx.suspendWhenIdle();
    sfx.unlock();
    vi.advanceTimersByTime(END_SOUND_MS * 2);
    expect(context.suspend).not.toHaveBeenCalled();
    expect(context.resume).toHaveBeenCalledTimes(2);
  });

  it("消音中は音を鳴らさないので，待たずに止める", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.muted = true;
    sfx.play("end");
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(0);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });
});
