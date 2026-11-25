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
import { HoldTracker } from "../input/hold";
import { keyAction, yieldsToFocusedButton, type KeyAction } from "../input/keys";
import { watchMotionPreference } from "../render/motion";
import { Renderer } from "../render/renderer";
import { toStagePoint } from "../render/viewport";
import { buildShareText, type ShareText } from "../share/share";
import { getElements, setData, setText, type Elements } from "./dom";
import { countdownNumber, formatRemainingSeconds, formatScore, kanpaiStatus } from "./format";
import { FrameLoop } from "./frame-loop";
import { bindShareButtons, renderResult } from "./result-view";
import { PlaySession, type Clock } from "./session";

const KEY_SOURCE = "key";
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
  readonly #sfx = new Sfx();
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
    const action = keyAction(event.code);
    if (action === undefined || !KEY_SCREENS.has(this.#screen) || this.#yieldsToButton(action)) {
      return;
    }
    event.preventDefault();
    this.#runKeyAction(action, event.repeat);
  }

  #yieldsToButton(action: KeyAction): boolean {
    const focused = this.#ui.app.ownerDocument.activeElement;
    return yieldsToFocusedButton(action, focused, focused === this.#ui.kanpaiButton);
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (keyAction(event.code)?.kind === "kanpai") {
      this.release(KEY_SOURCE);
    }
  }

  press(source: string): void {
    this.#hold.press(source);
    this.#session.setHeld(this.#hold.isHeld);
  }

  release(source: string): void {
    this.#hold.release(source);
    this.#session.setHeld(this.#hold.isHeld);
  }

  releaseAll(): void {
    this.#hold.releaseAll();
    this.#session.setHeld(false);
  }

  #runKeyAction(action: KeyAction, isRepeat: boolean): void {
    switch (action.kind) {
      case "kanpai":
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
    if (participantId === undefined) {
      this.#renderer.addMiss(point, this.#session.game.timeMs);
      this.#sfx.play("throw");
      return;
    }
    const hitsBefore = this.#session.game.hits;
    this.#session.throwAt(participantId);
    this.#sfx.play(this.#session.game.hits > hitsBefore ? "hit" : "misfire");
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
      this.#sfx.play("go");
      this.dispatch("countdownDone");
      return;
    }
    const shown = countdownNumber(remaining);
    setText(this.#ui.countdown, String(shown));
    if (shown !== this.#countdownShown) {
      this.#sfx.play("count");
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
  ui.muteButton.addEventListener("click", () => {
    app.toggleMute();
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
  win.addEventListener("blur", () => {
    app.releaseAll();
  });
  doc.addEventListener("visibilitychange", () => {
    app.releaseAll();
    if (doc.visibilityState === "hidden") {
      app.hide();
    }
  });
}

export function startApp(doc: Document, win: Window): void {
  const ui = getElements(doc);
  const renderer = new Renderer(ui.canvas);
  watchMotionPreference(win.matchMedia("(prefers-reduced-motion: reduce)"), (profile) => {
    renderer.setMotion(profile);
  });
  const loop = new FrameLoop(
    (callback) => win.requestAnimationFrame(callback),
    (frameMs) => {
      app.frame(frameMs);
    },
  );
  const app = new App(ui, () => Math.round(win.performance.now()), renderer, loop);
  bindButtons(ui, app);
  bindKanpaiButton(ui.kanpaiButton, app);
  bindStage(ui, app);
  bindWindow(doc, win, app);
  bindShareButtons(ui, win.navigator, () => app.shareText);
  const resize = () => {
    renderer.resize(ui.stage.clientWidth, win.devicePixelRatio);
    loop.refresh();
  };
  new ResizeObserver(resize).observe(ui.stage);
  resize();
}
