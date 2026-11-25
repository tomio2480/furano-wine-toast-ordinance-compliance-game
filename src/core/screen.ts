export type Screen = "title" | "countdown" | "play" | "pause" | "result";

export type ScreenEvent =
  | "start"
  | "countdownDone"
  | "pause"
  | "resume"
  | "timeUp"
  | "retry"
  | "toTitle";

/**
 * 画面遷移の表（要件書の図 1）．表にない組み合わせの事象は無視する．
 * 一時停止はタブが隠れたときと，一時停止ボタンを押したときに起きる．
 */
const TRANSITIONS: Readonly<Record<Screen, Partial<Record<ScreenEvent, Screen>>>> = {
  title: { start: "countdown" },
  countdown: { countdownDone: "play", pause: "pause" },
  play: { pause: "pause", timeUp: "result" },
  pause: { resume: "countdown" },
  result: { retry: "countdown", toTitle: "title" },
};

export function nextScreen(screen: Screen, event: ScreenEvent): Screen {
  return TRANSITIONS[screen][event] ?? screen;
}
