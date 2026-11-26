import { Sfx, type SoundName } from "../audio/sfx";
import { COUNTDOWN_MS, GAME_DURATION_MS } from "../config";
import { isTimeUp, summarize } from "../core/game";
import { createRandom } from "../core/random";
import type { KanpaiMode } from "../core/score";
import { nextScreen, type Screen, type ScreenEvent } from "../core/screen";
import {
  findSlot,
  hitboxCenter,
  participantInSlot,
  targetAt,
  type Point,
} from "../core/targeting";
import { HeldSpaceGuard } from "../input/held-space";
import { HoldTracker } from "../input/hold";
import { isPlainKey, keyAction, yieldsToFocusedButton, type KeyAction } from "../input/keys";
import { FULL_MOTION, watchMotionPreference, type MotionProfile } from "../render/motion";
import { Renderer } from "../render/renderer";
import { textBoost, toStagePoint, watchPixelRatio } from "../render/viewport";
import { buildShareText, type ShareText } from "../share/share";
import { announce, clearAnnouncement, getElements, setData, setText, type Elements } from "./dom";
import { countdownNumber, formatRemainingSeconds, formatScore, kanpaiStatus } from "./format";
import { FrameLoop } from "./frame-loop";
import { mountPixelLogo, replayOnPointer } from "./pixel-logo";
import { announceResult, bindShareButtons, renderResult } from "./result-view";
import { PlaySession, type Clock } from "./session";
import { throwSound } from "./throw-sound";

const KEY_SOURCE = "key";
/** PointerEvent.button の主ボタン． */
const PRIMARY_BUTTON = 0;
const KANPAI_SOUND_MS = 300;
const KANPAI_SOUNDS: Readonly<Record<KanpaiMode, SoundName | undefined>> = {
  plus: "clink",
  minus: "warn",
  neutral: undefined,
};
/** キー操作を受け付ける画面．メニュー系の画面では Space をボタンの操作に譲る． */
const KEY_SCREENS: ReadonlySet<Screen> = new Set(["countdown", "play"]);

const noop = () => undefined;

/** 利用者の操作から始まり，効果音を鳴らし始める画面遷移． */
type GestureEvent = Extract<ScreenEvent, "start" | "resume" | "retry">;

class App {
  readonly #ui: Elements;
  readonly #clock: Clock;
  readonly #session: PlaySession;
  readonly #renderer: Renderer;
  readonly #loop: FrameLoop;
  readonly #hold = new HoldTracker();
  readonly #heldSpace = new HeldSpaceGuard();
  readonly #sfx = new Sfx();
  /** 雪玉が届くまでの時間．当たった音をこの分だけ遅らせ，絵の命中に合わせる． */
  #impactDelayMs = FULL_MOTION.flightMs;
  #screen: Screen = "title";
  #countdownEndsAt = 0;
  #countdownShown = 0;
  #kanpaiSoundKey = "";
  #shareText: ShareText;

  readonly #onEvent: Partial<Record<ScreenEvent, () => void>> = {
    start: () => {
      this.#newGame();
    },
    retry: () => {
      this.#newGame();
    },
  };

  readonly #onEnter: Readonly<Record<Screen, () => void>> = {
    title: noop,
    countdown: () => {
      this.#beginCountdown();
    },
    play: () => {
      this.#session.run();
      this.#applyHold();
    },
    pause: () => {
      this.#stop();
    },
    result: () => {
      this.#finish();
    },
  };

  readonly #onTick: Readonly<Record<Screen, () => void>> = {
    title: noop,
    countdown: () => {
      this.#tickCountdown();
    },
    play: () => {
      this.#tickPlay();
    },
    pause: noop,
    result: noop,
  };

  /**
   * 動きのある画面でだけ描き続ける．止まった画面では描画と効果音を休ませ，
   * 5 秒を超えて動き続ける演出をメニューの横に出さない（WCAG 2.2.2）．
   */
  readonly #activity: Readonly<Record<Screen, () => void>> = {
    title: () => {
      this.#rest();
    },
    countdown: () => {
      this.#loop.run();
    },
    play: () => {
      this.#loop.run();
    },
    pause: () => {
      this.#rest();
    },
    result: () => {
      this.#rest();
    },
  };

  readonly #focusTarget: Readonly<Record<Screen, () => HTMLElement>>;

  /** 焦点を移した後に行うこと．読み上げを焦点の移動の読み上げに続けて流す． */
  readonly #afterFocus: Partial<Record<Screen, () => void>> = {
    result: () => {
      announceResult(this.#ui, summarize(this.#session.game));
    },
  };

  constructor(ui: Elements, clock: Clock, renderer: Renderer, loop: FrameLoop) {
    this.#ui = ui;
    this.#clock = clock;
    this.#renderer = renderer;
    this.#loop = loop;
    this.#session = new PlaySession(clock, createRandom(Date.now()));
    this.#shareText = buildShareText(summarize(this.#session.game));
    this.#focusTarget = {
      title: () => ui.startButton,
      countdown: () => ui.kanpaiButton,
      play: () => ui.kanpaiButton,
      pause: () => ui.resumeButton,
      result: () => ui.resultHeading,
    };
  }

  dispatch(event: ScreenEvent): void {
    const next = nextScreen(this.#screen, event);
    if (next === this.#screen) {
      return;
    }
    this.#onEvent[event]?.();
    this.#screen = next;
    this.#onEnter[next]();
    this.#activity[next]();
    setData(this.#ui.app, "screen", next);
    this.#focusTarget[next]().focus();
    this.#afterFocus[next]?.();
  }

  frame(frameMs: number): void {
    this.#session.sync();
    this.#onTick[this.#screen]();
    this.#updateHud();
    this.#playKanpaiSound();
    this.#renderer.draw(this.#session.game, frameMs);
  }

  /** ボタンの操作で遊びを始める・再開する．効果音もこの操作の中で鳴らせるようにする． */
  begin(event: GestureEvent): void {
    this.#sfx.unlock();
    this.dispatch(event);
  }

  /** タブが隠れたら一時停止し，音も止める． */
  hide(): void {
    this.releaseAll();
    this.dispatch("pause");
    this.#sfx.suspendWhenIdle();
  }

  get shareText(): ShareText {
    return this.#shareText;
  }

  /** 動きを減らす設定が変わったら，演出と，当たった音の時機を合わせ直す． */
  setMotion(profile: MotionProfile): void {
    this.#renderer.setMotion(profile);
    this.#impactDelayMs = profile.flightMs;
  }

  /**
   * 遊んでいる間の利用者の操作で，止まった効果音を再開する．
   * iOS では着信などで音が中断され，再開には利用者の操作が要るためである．
   */
  resumeSound(): void {
    if (KEY_SCREENS.has(this.#screen)) {
      this.#sfx.unlock();
    }
  }

  toggleMute(): void {
    this.#sfx.muted = !this.#sfx.muted;
    this.#ui.muteButton.setAttribute("aria-pressed", String(this.#sfx.muted));
  }

  throwAtPoint(point: Point): void {
    if (this.#screen !== "play") {
      return;
    }
    this.#session.sync();
    this.#throw(targetAt(this.#session.game.participants, point), point);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const action = isPlainKey(event) ? keyAction(event.code) : undefined;
    if (action === undefined) {
      return;
    }
    if (!KEY_SCREENS.has(this.#screen)) {
      this.#swallowHeldSpace(event, action);
      return;
    }
    if (this.#yieldsToButton(action)) {
      return;
    }
    event.preventDefault();
    if (!event.repeat) {
      this.resumeSound();
    }
    this.#runKeyAction(action, event.repeat);
  }

  /** 乾杯に使ったまま押し続けている Space を，メニューのボタンに渡さない． */
  #swallowHeldSpace(event: KeyboardEvent, action: KeyAction): void {
    if (action.kind === "kanpai" && this.#heldSpace.swallowsKeyDown(event.repeat)) {
      event.preventDefault();
    }
  }

  #yieldsToButton(action: KeyAction): boolean {
    const focused = this.#ui.app.ownerDocument.activeElement;
    return yieldsToFocusedButton(action, focused, focused === this.#ui.kanpaiButton);
  }

  /**
   * 遊んでいる間にポインタで押したボタンからは，焦点を乾杯ボタンへ戻す．
   * 焦点が残ると，次の Space がそのボタンの操作に譲られ，乾杯できなくなるためである．
   */
  returnFocusAfterPointer(): void {
    if (KEY_SCREENS.has(this.#screen)) {
      this.#ui.kanpaiButton.focus();
    }
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (keyAction(event.code)?.kind !== "kanpai") {
      return;
    }
    if (this.#heldSpace.swallowsKeyUp()) {
      event.preventDefault();
    }
    this.release(KEY_SOURCE);
  }

  press(source: string): void {
    this.#hold.press(source);
    this.#applyHold();
  }

  release(source: string): void {
    this.#hold.release(source);
    this.#applyHold();
  }

  /**
   * 押下はプレイ中にだけ得点へ反映する．カウントダウン中の押下は覚えておき，
   * 中立の表示のまま，プレイが始まった瞬間に反映する（先行入力）．
   */
  #applyHold(): void {
    if (this.#screen === "play") {
      this.#session.setHeld(this.#hold.isHeld);
    }
  }

  releaseAll(): void {
    this.#hold.releaseAll();
    this.#session.setHeld(false);
  }

  #runKeyAction(action: KeyAction, isRepeat: boolean): void {
    switch (action.kind) {
      case "kanpai":
        this.#heldSpace.start();
        this.press(KEY_SOURCE);
        return;
      case "throw":
        this.#throwAtSlot(action.slotId, isRepeat);
        return;
      case "pause":
        this.dispatch("pause");
        return;
    }
  }

  #throwAtSlot(slotId: number, isRepeat: boolean): void {
    const slot = findSlot(slotId);
    if (slot === undefined || isRepeat || this.#screen !== "play") {
      return;
    }
    this.#session.sync();
    this.#throw(participantInSlot(this.#session.game.participants, slotId), hitboxCenter(slot));
  }

  #throw(participantId: number | undefined, point: Point): void {
    const before = this.#session.game;
    if (participantId === undefined) {
      this.#session.missAt(point);
    } else {
      this.#session.throwAt(participantId);
    }
    const sound = throwSound(before, this.#session.game);
    if (sound !== undefined) {
      // 投げる音はすぐに，当たった音は雪玉が届く瞬間に鳴らす．
      this.#sfx.play(sound, sound === "throw" ? 0 : this.#impactDelayMs);
    }
  }

  #newGame(): void {
    this.#hold.releaseAll();
    this.#session.newGame();
  }

  #beginCountdown(): void {
    this.#countdownEndsAt = this.#clock() + COUNTDOWN_MS;
    this.#countdownShown = 0;
  }

  #tickCountdown(): void {
    const remaining = this.#countdownEndsAt - this.#clock();
    if (remaining <= 0) {
      clearAnnouncement(this.#ui.countdownLive);
      this.#sfx.play("go");
      this.dispatch("countdownDone");
      return;
    }
    const shown = countdownNumber(remaining);
    setText(this.#ui.countdown, String(shown));
    if (shown !== this.#countdownShown) {
      this.#sfx.play("count");
      announce(this.#ui.countdownLive, String(shown));
      this.#countdownShown = shown;
    }
  }

  #tickPlay(): void {
    if (isTimeUp(this.#session.game)) {
      this.dispatch("timeUp");
    }
  }

  #stop(): void {
    this.#hold.releaseAll();
    this.#session.halt();
  }

  #rest(): void {
    this.#loop.still();
    this.#sfx.suspendWhenIdle();
  }

  #finish(): void {
    this.#stop();
    this.#shareText = renderResult(this.#ui, summarize(this.#session.game));
    this.#sfx.play("end");
  }

  #updateHud(): void {
    const game = this.#session.game;
    setText(this.#ui.timeLeft, formatRemainingSeconds(GAME_DURATION_MS - game.timeMs));
    setText(this.#ui.score, formatScore(summarize(game).score));
    setData(this.#ui.app, "kanpai", game.meter.mode);
    setText(this.#ui.kanpaiStatus, kanpaiStatus(game.meter.mode));
  }

  /** 乾杯の状態が続く間，一定の間隔で音を鳴らす． */
  #playKanpaiSound(): void {
    const { meter, timeMs } = this.#session.game;
    const sound = KANPAI_SOUNDS[meter.mode];
    const tick = Math.floor((timeMs - meter.startedAtMs) / KANPAI_SOUND_MS);
    const key = `${meter.mode}:${meter.startedAtMs}:${tick}`;
    if (sound === undefined || key === this.#kanpaiSoundKey) {
      return;
    }
    this.#kanpaiSoundKey = key;
    this.#sfx.play(sound);
  }
}

function bindButtons(ui: Elements, app: App): void {
  ui.startButton.addEventListener("click", () => {
    app.begin("start");
  });
  ui.resumeButton.addEventListener("click", () => {
    app.begin("resume");
  });
  ui.retryButton.addEventListener("click", () => {
    app.begin("retry");
  });
  ui.titleButton.addEventListener("click", () => {
    app.dispatch("toTitle");
  });
  ui.pauseButton.addEventListener("click", () => {
    app.dispatch("pause");
  });
  ui.muteButton.addEventListener("click", (event) => {
    app.toggleMute();
    // detail はポインタでの押下で 1 以上，キーボードでの押下で 0 になる．
    if (event.detail > 0) {
      app.returnFocusAfterPointer();
    }
  });
}

/** 乾杯ボタンは指がずれても押下を続ける．複数の指を区別する． */
function bindKanpaiButton(button: HTMLButtonElement, app: App): void {
  const source = (event: PointerEvent) => `pointer:${event.pointerId}`;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    app.press(source(event));
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    button.addEventListener(type, (event) => {
      app.release(source(event));
    });
  }
}

function bindStage(ui: Elements, app: App): void {
  ui.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    // 投げるのは主ボタン（マウスの左，指，ペン）だけにする．
    if (event.button !== PRIMARY_BUTTON) {
      return;
    }
    const point = toStagePoint(event.clientX, event.clientY, ui.canvas.getBoundingClientRect());
    app.throwAtPoint(point);
  });
  ui.stage.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

function bindWindow(doc: Document, win: Window, app: App): void {
  doc.addEventListener("keydown", (event) => {
    app.handleKeyDown(event);
  });
  doc.addEventListener("keyup", (event) => {
    app.handleKeyUp(event);
  });
  // タッチでは pointerdown が利用者の操作に数えられないため，指を離したときに音を再開する．
  doc.addEventListener("pointerup", () => {
    app.resumeSound();
  });
  win.addEventListener("blur", () => {
    app.releaseAll();
  });
  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "hidden") {
      app.hide();
      return;
    }
    app.releaseAll();
  });
}

/**
 * タイトルの題字をドット絵にし，題字と称号の GIF 風の動きを，触れたときにもう一度流せるようにする．
 * 動きは画面を出すたびに CSS で約 5 秒だけ流れて止まる（WCAG 2.2.2）．
 */
function bindRetroMotion(ui: Elements): void {
  mountPixelLogo(ui.titleHeading);
  replayOnPointer(ui.titleHeading, () => ui.titleHeading.querySelectorAll("canvas"));
  replayOnPointer(ui.resultTitle.parentElement ?? ui.resultTitle, () => [ui.resultTitle]);
}

export function startApp(doc: Document, win: Window): void {
  const ui = getElements(doc);
  const renderer = new Renderer(ui.canvas);
  const loop = new FrameLoop(
    (callback) => win.requestAnimationFrame(callback),
    (frameMs) => {
      app.frame(frameMs);
    },
  );
  const app = new App(ui, () => Math.round(win.performance.now()), renderer, loop);
  watchMotionPreference(win.matchMedia("(prefers-reduced-motion: reduce)"), (profile) => {
    app.setMotion(profile);
    loop.refresh();
  });
  bindButtons(ui, app);
  bindKanpaiButton(ui.kanpaiButton, app);
  bindStage(ui, app);
  bindWindow(doc, win, app);
  bindShareButtons(ui, win.navigator, () => app.shareText);
  bindRetroMotion(ui);
  const resize = () => {
    renderer.resize(ui.stage.clientWidth, win.devicePixelRatio);
    ui.stage.style.setProperty("--text-boost", String(textBoost(ui.stage.clientWidth)));
    loop.refresh();
  };
  new ResizeObserver(resize).observe(ui.stage);
  watchPixelRatio(win, resize);
  resize();
}
