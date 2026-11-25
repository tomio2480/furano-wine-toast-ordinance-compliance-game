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

/** 終了音は 0.3 秒後に始まる 0.32 秒の音で終わる．止めるのは，出力の遅れの分の余白をおいてから． */
const END_SOUND_MS = 620;
const SUSPEND_MARGIN_MS = 250;

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

  it("鳴っている音がなければ，出力の遅れの分だけ待って止める", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(SUSPEND_MARGIN_MS);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  it("鳴っている音が終わり，出力の遅れの分も待ってから止める", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.play("end");
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(END_SOUND_MS + SUSPEND_MARGIN_MS - 1);
    expect(context.suspend).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  it("作り直した AudioContext では，前の時計で予約した終わりの時刻を使わない", async () => {
    const first = fakeContext();
    const second = fakeContext();
    first.currentTime = 300;
    first.suspend.mockImplementation(() => Promise.reject(new Error("closed")));
    const contexts = [first, second];
    const sfx = new Sfx(() => (contexts.shift() ?? second) as unknown as AudioContext);
    sfx.unlock();
    sfx.play("end");
    sfx.suspendWhenIdle();
    await vi.advanceTimersByTimeAsync(END_SOUND_MS + SUSPEND_MARGIN_MS);
    sfx.unlock();
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(SUSPEND_MARGIN_MS);
    expect(second.suspend).toHaveBeenCalledTimes(1);
  });

  it("AudioContext を作れない環境では，音を出さずに遊べる", () => {
    const sfx = new Sfx(() => {
      throw new Error("Web Audio is disabled");
    });
    expect(() => {
      sfx.unlock();
      sfx.play("end");
      sfx.suspendWhenIdle();
    }).not.toThrow();
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

  it("止められなかった AudioContext は捨て，次の開始操作で作り直す", async () => {
    const { context, create, sfx } = setup();
    context.suspend.mockImplementation(() => Promise.reject(new Error("closed")));
    sfx.unlock();
    sfx.suspendWhenIdle();
    await vi.advanceTimersByTimeAsync(SUSPEND_MARGIN_MS);
    sfx.unlock();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("消音中は音を鳴らさないので，終了音の長さは待たない", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.muted = true;
    sfx.play("end");
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(SUSPEND_MARGIN_MS);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });
});
