import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "./sfx";

/** 効果音の合成に必要な分だけを持つ AudioContext の代役．作った音源を記録する． */
function fakeContext() {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = <T extends object>(extra: T) => ({ ...extra, connect: (target: unknown) => target });
  const oscillators: { type: string; start: ReturnType<typeof vi.fn> }[] = [];
  const noises: { start: ReturnType<typeof vi.fn> }[] = [];
  const filters: { type: string }[] = [];
  return {
    currentTime: 0,
    sampleRate: 48_000,
    destination: {},
    oscillators,
    noises,
    filters,
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createOscillator: () => {
      const oscillator = node({ type: "sine", frequency: param(), start: vi.fn(), stop: vi.fn() });
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => node({ gain: param() }),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => {
      const source = node({ buffer: null, start: vi.fn(), stop: vi.fn() });
      noises.push(source);
      return source;
    },
    createBiquadFilter: () => {
      const filter = node({ type: "lowpass", frequency: param(), Q: param() });
      filters.push(filter);
      return filter;
    },
  };
}

function setup() {
  const context = fakeContext();
  const create = vi.fn(() => context as unknown as AudioContext);
  return { context, create, sfx: new Sfx(create) };
}

describe("Sfx の音の組み立て", () => {
  it("雪玉が当たった音は，帯域を絞った雑音を短く鳴らす乾いた音にする", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.play("hit");
    expect(context.noises).toHaveLength(1);
    expect(context.filters.map((filter) => filter.type)).toEqual(["bandpass"]);
  });

  it("誤射の音は，当たった音の後に低い警告音を続ける", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.play("misfire");
    expect(context.noises).toHaveLength(1);
    const warning = context.oscillators.find((oscillator) => oscillator.type === "sawtooth");
    const warningStart = warning?.start.mock.calls[0]?.[0] as number;
    expect(warningStart).toBeGreaterThan(context.noises[0]?.start.mock.calls[0]?.[0] as number);
  });

  it("遅れを指定すると，その分だけ遅らせて鳴らす", () => {
    const { context, sfx } = setup();
    sfx.unlock();
    sfx.play("hit", 140);
    expect(context.noises[0]?.start).toHaveBeenCalledWith(0.14);
  });

  it("雑音の元は AudioContext ごとに 1 度だけ作る", () => {
    const { context, sfx } = setup();
    const createBuffer = vi.spyOn(context, "createBuffer");
    sfx.unlock();
    sfx.play("hit");
    sfx.play("hit");
    expect(createBuffer).toHaveBeenCalledTimes(1);
  });
});

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

  it("再開できなかった AudioContext は閉じてから捨てる", async () => {
    const { context, create, sfx } = setup();
    context.resume.mockImplementation(() => Promise.reject(new Error("interrupted")));
    sfx.unlock();
    await vi.advanceTimersByTimeAsync(0);
    expect(context.close).toHaveBeenCalledTimes(1);
    sfx.unlock();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("前の AudioContext を止められなかったときも，作り直した AudioContext は捨てない", async () => {
    const first = fakeContext();
    const second = fakeContext();
    let rejectSuspend: (error: Error) => void = () => undefined;
    first.suspend.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSuspend = reject;
        }),
    );
    const contexts = [first, second];
    const sfx = new Sfx(() => (contexts.shift() ?? second) as unknown as AudioContext);
    sfx.unlock();
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(SUSPEND_MARGIN_MS);
    first.resume.mockImplementation(() => Promise.reject(new Error("interrupted")));
    sfx.unlock();
    await vi.advanceTimersByTimeAsync(0);
    sfx.unlock();
    rejectSuspend(new Error("closed"));
    await vi.advanceTimersByTimeAsync(0);
    sfx.play("hit");
    expect(second.noises).toHaveLength(1);
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

  it("遅らせて鳴らす音は，遅れの分も鳴り終わるのを待ってから止める", () => {
    const { context, sfx } = setup();
    const delayMs = 1_000;
    sfx.unlock();
    sfx.play("hit", delayMs);
    sfx.suspendWhenIdle();
    vi.advanceTimersByTime(delayMs + SUSPEND_MARGIN_MS);
    expect(context.suspend).not.toHaveBeenCalled();
    vi.advanceTimersByTime(END_SOUND_MS);
    expect(context.suspend).toHaveBeenCalledTimes(1);
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
