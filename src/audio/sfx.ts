// 効果音は音声ファイルを置かず，Web Audio API で合成する．
// 自動再生の制限に合わせ，利用者の開始操作の後から鳴らす．

export type SoundName = "throw" | "hit" | "misfire" | "clink" | "warn" | "count" | "go" | "end";

interface Tone {
  readonly wave: OscillatorType;
  readonly fromHz: number;
  readonly toHz: number;
  readonly durationMs: number;
  readonly gain: number;
  readonly delayMs: number;
}

function tone(
  wave: OscillatorType,
  fromHz: number,
  toHz: number,
  durationMs: number,
  gain: number,
  delayMs = 0,
): Tone {
  return { wave, fromHz, toHz, durationMs, gain, delayMs };
}

const RECIPES: Readonly<Record<SoundName, readonly Tone[]>> = {
  throw: [tone("triangle", 520, 260, 90, 0.07)],
  hit: [tone("square", 200, 80, 110, 0.08), tone("triangle", 880, 1320, 120, 0.07, 40)],
  misfire: [tone("sawtooth", 240, 110, 260, 0.07)],
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

function playTone(ctx: AudioContext, sound: Tone): void {
  const start = ctx.currentTime + sound.delayMs / MS_PER_SECOND;
  const end = start + sound.durationMs / MS_PER_SECOND;
  const oscillator = ctx.createOscillator();
  oscillator.type = sound.wave;
  oscillator.frequency.setValueAtTime(sound.fromHz, start);
  oscillator.frequency.exponentialRampToValueAtTime(sound.toHz, end);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(sound.gain, start);
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, end);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

/** 効果音が鳴り終わるまでの長さ（ms）． */
function soundLengthMs(name: SoundName): number {
  return Math.max(...RECIPES[name].map((sound) => sound.delayMs + sound.durationMs));
}

export class Sfx {
  readonly #createContext: () => AudioContext;
  #context: AudioContext | undefined;
  /** 予約した音が鳴り終わる時刻（AudioContext の秒）． */
  #busyUntil = 0;
  #suspendTimer: ReturnType<typeof setTimeout> | undefined;
  muted = false;

  constructor(createContext: () => AudioContext = () => new AudioContext()) {
    this.#createContext = createContext;
  }

  /** 利用者の操作の中で呼ぶ．再生を許可されなかったときは，次の操作で作り直す． */
  unlock(): void {
    clearTimeout(this.#suspendTimer);
    this.#suspendTimer = undefined;
    const context = this.#context ?? this.#createContext();
    this.#context = context;
    context.resume().catch(() => {
      this.#context = undefined;
    });
  }

  play(name: SoundName): void {
    const context = this.#context;
    if (context === undefined || this.muted) {
      return;
    }
    for (const sound of RECIPES[name]) {
      playTone(context, sound);
    }
    this.#busyUntil = Math.max(this.#busyUntil, context.currentTime + soundLengthMs(name) / MS_PER_SECOND);
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
    const waitMs = Math.max(0, Math.round((this.#busyUntil - context.currentTime) * MS_PER_SECOND));
    this.#suspendTimer = setTimeout(() => {
      this.#suspendTimer = undefined;
      void context.suspend();
    }, waitMs);
  }
}
