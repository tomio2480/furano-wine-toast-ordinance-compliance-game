import { EXIT_ANIMATION_MS, HIT_SCORE, MISFIRE_SCORE } from "../config";
import type { Exit, ExitReason } from "../core/game";
import type { Point } from "../core/targeting";
import type { Pose } from "./people";

/** 演出の強さ．prefers-reduced-motion のときは控えめにする． */
export interface MotionProfile {
  readonly flightMs: number;
  readonly appearMs: number;
  readonly particles: number;
  readonly popupRise: number;
  readonly swing: number;
  /** 繰り返す明滅や脈動の強さ．0 なら繰り返さない． */
  readonly pulse: number;
  readonly snowSpeed: number;
  /** 命中して退場するときに沈む量． */
  readonly exitDrop: number;
  /** 時間切れで退場するときに横へずれる量． */
  readonly exitShift: number;
  /** 散る雪が縮む割合．0 なら大きさを変えない． */
  readonly burstShrink: number;
}

export const FULL_MOTION: MotionProfile = {
  flightMs: 140,
  appearMs: 160,
  particles: 8,
  popupRise: 26,
  swing: 0.14,
  pulse: 1,
  snowSpeed: 1,
  exitDrop: 28,
  exitShift: 16,
  burstShrink: 1,
};

/** 動きを減らす設定では，位置と大きさを変えず，現れる・消えるだけにする． */
export const REDUCED_MOTION: MotionProfile = {
  flightMs: 1,
  appearMs: 1,
  particles: 0,
  popupRise: 0,
  swing: 0,
  pulse: 0,
  snowSpeed: 0,
  exitDrop: 0,
  exitShift: 0,
  burstShrink: 0,
};

/** 開始からの経過を 0〜1 の割合で返す． */
export function progress(nowMs: number, startMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
}

/** 始点から終点へ放物線を描く位置．height は中間での持ち上がり． */
export function arcPoint(from: Point, to: Point, t: number, height: number): Point {
  const lift = height * 4 * t * (1 - t);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t - lift,
  };
}

export interface Popup {
  readonly text: string;
  readonly tone: "good" | "bad";
}

const EXIT_POPUPS: Partial<Record<ExitReason, Popup>> = {
  hit: { text: `+${HIT_SCORE}`, tone: "good" },
  misfire: { text: String(MISFIRE_SCORE), tone: "bad" },
};

/** 退場に添える得点の表示．時間切れの退場には出さない． */
export function exitPopup(exit: Exit): Popup | undefined {
  return EXIT_POPUPS[exit.reason];
}

/**
 * 乾杯中の得点表示は，この周期で薄れては戻る．
 * 1 秒に 3 回を超えて明滅させないため，周期は 1000 / 3 ms より長くする（WCAG 2.3.1）．
 */
export const KANPAI_POPUP_CYCLE_MS = 600;

/** 乾杯中の得点表示の進み具合（0〜1）．動きを減らす設定では 0 のまま止める． */
export function kanpaiPopupPhase(elapsedMs: number, profile: MotionProfile): number {
  return ((elapsedMs % KANPAI_POPUP_CYCLE_MS) / KANPAI_POPUP_CYCLE_MS) * profile.pulse;
}

export interface Placement {
  readonly alpha: number;
  readonly dx: number;
  readonly dy: number;
  readonly pose: Pose;
}

export const CALM: Pose = { surprised: false, snow: 0 };

function hitPlacement(exit: Exit, nowMs: number, profile: MotionProfile): Placement {
  const isHit = nowMs - exit.atMs >= profile.flightMs;
  const after = progress(nowMs, exit.atMs + profile.flightMs, EXIT_ANIMATION_MS - profile.flightMs);
  return {
    alpha: 1 - after,
    dx: 0,
    dy: after * profile.exitDrop,
    pose: { surprised: isHit, snow: Number(isHit) },
  };
}

function timeoutPlacement(exit: Exit, nowMs: number, profile: MotionProfile): Placement {
  const after = progress(nowMs, exit.atMs, EXIT_ANIMATION_MS);
  return { alpha: 1 - after, dx: after * profile.exitShift, dy: 0, pose: CALM };
}

const EXIT_PLACEMENT: Readonly<
  Record<ExitReason, (exit: Exit, nowMs: number, profile: MotionProfile) => Placement>
> = {
  hit: hitPlacement,
  misfire: hitPlacement,
  timeout: timeoutPlacement,
};

/** 退場していく人の位置と透明度． */
export function exitPlacement(exit: Exit, nowMs: number, profile: MotionProfile): Placement {
  return EXIT_PLACEMENT[exit.reason](exit, nowMs, profile);
}

const BURST_MIN_RADIUS = 2;
const BURST_SHRINK_RADIUS = 10;

/** 散る雪の中心の半径．t は 0〜1． */
export function burstRadius(t: number, profile: MotionProfile): number {
  return BURST_MIN_RADIUS + BURST_SHRINK_RADIUS * (1 - t * profile.burstShrink);
}

/** matchMedia の戻り値のうち，ここで使う部分． */
export interface MotionQuery {
  readonly matches: boolean;
  addEventListener(type: "change", listener: (event: { readonly matches: boolean }) => void): void;
}

const PROFILE_FOR_REDUCED: Readonly<Record<"true" | "false", MotionProfile>> = {
  true: REDUCED_MOTION,
  false: FULL_MOTION,
};

/** 動きを減らす設定を起動時に適用し，その後の変更にも追従する． */
export function watchMotionPreference(query: MotionQuery, apply: (profile: MotionProfile) => void): void {
  apply(PROFILE_FOR_REDUCED[`${query.matches}`]);
  query.addEventListener("change", (event) => {
    apply(PROFILE_FOR_REDUCED[`${event.matches}`]);
  });
}
