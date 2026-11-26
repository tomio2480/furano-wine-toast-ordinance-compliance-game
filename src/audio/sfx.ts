// 効果音は音声ファイルを置かず，Web Audio API で合成する．
// 自動再生の制限に合わせ，利用者の開始操作の後から鳴らす．

export type SoundName = "throw" | "hit" | "misfire" | "clink" | "warn" | "count" | "go" | "end";

/** 周波数を滑らかに変える単音． */
interface Tone {
  readonly kind: "tone";
  readonly wave: OscillatorType;
  readonly fromHz: number;
  readonly toHz: number;
  readonly durationMs: number;
  readonly gain: number;
  readonly delayMs: number;
}

/** 帯域を絞った雑音．打撃のような音程のない音に使う． */
interface Noise {
  readonly kind: "noise";
  readonly centerHz: number;
  /** 帯域の鋭さ．小さいほど広い帯域を通す． */
  readonly q: number;
  readonly durationMs: number;
  readonly gain: number;
  readonly delayMs: number;
}

type Voice = Tone | Noise;

function tone(
  wave: OscillatorType,
  fromHz: number,
  toHz: number,
  durationMs: number,
  gain: number,
  delayMs = 0,
): Tone {
  return { kind: "tone", wave, fromHz, toHz, durationMs, gain, delayMs };
}

function noise(centerHz: number, q: number, durationMs: number, gain: number): Noise {
  return { kind: "noise", centerHz, q, durationMs, gain, delayMs: 0 };
}

const IMPACT_MS = 90;
/** 雪玉が当たった音．壁に当てたような乾いた「パン」とし，低い音を短く重ねて手応えを出す． */
const SNOW_IMPACT: readonly Voice[] = [noise(1_400, 0.8, IMPACT_MS, 0.6), tone("sine", 180, 60, 60, 0.1)];

const RECIPES: Readonly<Record<SoundName, readonly Voice[]>> = {
  throw: [tone("triangle", 520, 260, 90, 0.07)],
  hit: SNOW_IMPACT,
  /** 当たった音の後に低い警告音を続け，命中と聞き分けられるようにする． */
  misfire: [...SNOW_IMPACT, tone("sawtooth", 240, 110, 260, 0.07, IMPACT_MS)],
  clink: [tone("sine", 2093, 2093, 150, 0.05), tone("sine", 2637, 2637, 190, 0.035, 25)],
  warn: [tone("square", 330, 330, 80, 0.035)],
  count: [tone("sine", 660, 660, 120, 0.07)],
  go: [tone("sine", 990, 990, 240, 0.08)],
  end: [
    tone("triangle", 784, 784, 150, 0.08),
    tone("triangle", 988, 988, 150, 0.08, 150),
    tone("triangle", 1319, 1319, 320, 0.08, 300),
  ],
};

const SILENT_GAIN = 0.0001;
const MS_PER_SECOND = 1_000;
/** 止めるまでの余白．Bluetooth の機器などの出力の遅れで，音の末尾が切れないようにする． */
const SUSPEND_MARGIN_MS = 250;
/** 雑音の元の長さ．最も長い雑音より長くする． */
const NOISE_BUFFER_MS = 250;

/** 鳴り始めの時刻（AudioContext の秒）． */
function startTime(ctx: AudioContext, voice: Voice, offsetMs: number): number {
  return ctx.currentTime + (offsetMs + voice.delayMs) / MS_PER_SECOND;
}

/** 立ち上がりを即座にし，終わりへ向けて指数的に消える音量の山． */
function envelope(ctx: AudioContext, peak: number, start: number, end: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, end);
  return gain;
}

function playTone(ctx: AudioContext, sound: Tone, offsetMs: number): void {
  const start = startTime(ctx, sound, offsetMs);
  const end = start + sound.durationMs / MS_PER_SECOND;
  const oscillator = ctx.createOscillator();
  oscillator.type = sound.wave;
  oscillator.frequency.setValueAtTime(sound.fromHz, start);
  oscillator.frequency.exponentialRampToValueAtTime(sound.toHz, end);
  oscillator.connect(envelope(ctx, sound.gain, start, end)).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

function playNoise(ctx: AudioContext, sound: Noise, buffer: AudioBuffer, offsetMs: number): void {
  const start = startTime(ctx, sound, offsetMs);
  const end = start + sound.durationMs / MS_PER_SECOND;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(sound.centerHz, start);
  filter.Q.setValueAtTime(sound.q, start);
  source.connect(filter).connect(envelope(ctx, sound.gain, start, end)).connect(ctx.destination);
  source.start(start);
  source.stop(end);
}

/** 白色雑音の元を作る．音の素材であり，乱数の質は問わない． */
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.ceil((ctx.sampleRate * NOISE_BUFFER_MS) / MS_PER_SECOND);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** 効果音が鳴り終わるまでの長さ（ms）． */
function soundLengthMs(name: SoundName): number {
  return Math.max(...RECIPES[name].map((sound) => sound.delayMs + sound.durationMs));
}

export class Sfx {
  readonly #createContext: () => AudioContext;
  #context: AudioContext | undefined;
  #noise: AudioBuffer | undefined;
  /** 予約した音が鳴り終わる時刻（AudioContext の秒）． */
  #busyUntil = 0;
  #suspendTimer: ReturnType<typeof setTimeout> | undefined;
  muted = false;

  constructor(createContext: () => AudioContext = () => new AudioContext()) {
    this.#createContext = createContext;
  }

  /**
   * 利用者の操作の中で呼ぶ．止まった音や，iOS などで中断された音もここで再開する．
   * 再開できなかったときは閉じて捨て，次の操作で作り直す．
   */
  unlock(): void {
    clearTimeout(this.#suspendTimer);
    this.#suspendTimer = undefined;
    const context = this.#context ?? this.#open();
    if (context === undefined) {
      return;
    }
    this.#context = context;
    context.resume().catch(() => {
      if (this.#context === context) {
        this.#context = undefined;
      }
      context.close().catch(() => undefined);
    });
  }

  /** AudioContext を作る．時計は 0 から始まるため，前の時計で求めた終わりの時刻は捨てる． */
  #open(): AudioContext | undefined {
    try {
      const context = this.#createContext();
      this.#busyUntil = 0;
      this.#noise = undefined;
      return context;
    } catch {
      // Web Audio を使えない環境では，効果音なしで遊べるようにする．
      return undefined;
    }
  }

  /** @param delayMs 鳴らし始めるまでの遅れ．雪玉が届く瞬間などに合わせる． */
  play(name: SoundName, delayMs = 0): void {
    const context = this.#context;
    if (context === undefined || this.muted) {
      return;
    }
    for (const voice of RECIPES[name]) {
      this.#playVoice(context, voice, delayMs);
    }
    const endMs = delayMs + soundLengthMs(name);
    this.#busyUntil = Math.max(this.#busyUntil, context.currentTime + endMs / MS_PER_SECOND);
  }

  #playVoice(context: AudioContext, voice: Voice, delayMs: number): void {
    if (voice.kind === "noise") {
      this.#noise ??= createNoiseBuffer(context);
      playNoise(context, voice, this.#noise, delayMs);
      return;
    }
    playTone(context, voice, delayMs);
  }

  /**
   * 鳴っている音が終わったら AudioContext を止め，電池の消費を抑える．
   * 止めた後は，利用者の操作の中で呼ぶ unlock で再開する．
   */
  suspendWhenIdle(): void {
    const context = this.#context;
    if (context === undefined) {
      return;
    }
    clearTimeout(this.#suspendTimer);
    const remainingMs = Math.max(0, Math.round((this.#busyUntil - context.currentTime) * MS_PER_SECOND));
    const waitMs = remainingMs + SUSPEND_MARGIN_MS;
    this.#suspendTimer = setTimeout(() => {
      this.#suspendTimer = undefined;
      context.suspend().catch(() => {
        // 閉じられた AudioContext は止められない．次の開始操作で作り直す．
        // その間に作り直していれば，新しい AudioContext は捨てない．
        if (this.#context === context) {
          this.#context = undefined;
        }
      });
    }, waitMs);
  }
}
