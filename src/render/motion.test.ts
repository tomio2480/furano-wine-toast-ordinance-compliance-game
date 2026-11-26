import { describe, expect, it } from "vitest";
import { EXIT_ANIMATION_MS } from "../config";
import type { Exit } from "../core/game";
import {
  arcPoint,
  burstRadius,
  exitPlacement,
  exitPopup,
  FULL_MOTION,
  KANPAI_POPUP_CYCLE_MS,
  kanpaiPopupPhase,
  progress,
  REDUCED_MOTION,
  warningAlpha,
  watchMotionPreference,
  type MotionProfile,
} from "./motion";

const exit = (reason: Exit["reason"]): Exit => ({
  participant: { id: 1, slotId: 1, drink: "beer", appearedAtMs: 0, leaveAtMs: 9_000 },
  reason,
  atMs: 1_000,
});

describe("progress", () => {
  it("開始時は 0，終了時は 1", () => {
    expect(progress(1_000, 1_000, 400)).toBe(0);
    expect(progress(1_400, 1_000, 400)).toBe(1);
  });

  it("範囲外は 0〜1 に収める", () => {
    expect(progress(900, 1_000, 400)).toBe(0);
    expect(progress(2_000, 1_000, 400)).toBe(1);
  });

  it("途中は割合を返す", () => {
    expect(progress(1_100, 1_000, 400)).toBe(0.25);
  });
});

describe("arcPoint", () => {
  const from = { x: 0, y: 100 };
  const to = { x: 100, y: 100 };

  it("両端は始点と終点", () => {
    expect(arcPoint(from, to, 0, 50)).toEqual(from);
    expect(arcPoint(from, to, 1, 50)).toEqual(to);
  });

  it("中間は弧の高さだけ持ち上がる", () => {
    expect(arcPoint(from, to, 0.5, 50)).toEqual({ x: 50, y: 50 });
  });
});

describe("exitPopup", () => {
  it("命中は先頭の 0 を残して +076", () => {
    expect(exitPopup(exit("hit"))).toEqual({ text: "+076", tone: "good" });
  });

  it("誤射は −38", () => {
    expect(exitPopup(exit("misfire"))).toEqual({ text: "−38", tone: "bad" });
  });

  it("時間切れの退場には出さない", () => {
    expect(exitPopup(exit("timeout"))).toBeUndefined();
  });
});

/** start から 1 秒の間に，表示が初めの状態へ戻った回数（明滅の回数）を数える． */
function flashesWithinOneSecond(startMs: number, profile: MotionProfile): number {
  const STEP_MS = 5;
  let flashes = 0;
  let previous = kanpaiPopupPhase(startMs, profile);
  for (let ms = startMs + STEP_MS; ms <= startMs + 1_000; ms += STEP_MS) {
    const phase = kanpaiPopupPhase(ms, profile);
    flashes += Number(phase < previous);
    previous = phase;
  }
  return flashes;
}

describe("kanpaiPopupPhase", () => {
  it("周期の中ほどで 0.5，周期の終わりで初めに戻る", () => {
    expect(kanpaiPopupPhase(KANPAI_POPUP_CYCLE_MS / 2, FULL_MOTION)).toBe(0.5);
    expect(kanpaiPopupPhase(KANPAI_POPUP_CYCLE_MS, FULL_MOTION)).toBe(0);
  });

  it("どの 1 秒間をとっても，明滅は 3 回以下", () => {
    for (let start = 0; start < 1_000; start += 10) {
      expect(flashesWithinOneSecond(start, FULL_MOTION)).toBeLessThanOrEqual(3);
    }
  });

  it("動きを減らす設定では明滅させない", () => {
    for (const ms of [0, 150, 299, 450, 1_234]) {
      expect(kanpaiPopupPhase(ms, REDUCED_MOTION)).toBe(0);
    }
  });
});

/** start から 1 秒の間に，濃さが薄れてから濃く戻り始めた回数（脈動の回数）を数える． */
function pulsesWithinOneSecond(startMs: number, profile: MotionProfile): number {
  const STEP_MS = 5;
  let pulses = 0;
  let previous = warningAlpha(startMs, profile);
  let isFading = false;
  for (let ms = startMs + STEP_MS; ms <= startMs + 1_000; ms += STEP_MS) {
    const alpha = warningAlpha(ms, profile);
    pulses += Number(isFading && alpha > previous);
    isFading = alpha < previous;
    previous = alpha;
  }
  return pulses;
}

describe("warningAlpha", () => {
  it("減点中の警告枠は濃さが変わる", () => {
    const samples = [0, 100, 200, 300].map((ms) => warningAlpha(ms, FULL_MOTION));
    expect(new Set(samples).size).toBeGreaterThan(1);
  });

  it("どの 1 秒間をとっても，警告枠の脈動は 3 回以下", () => {
    for (let start = 0; start < 1_000; start += 10) {
      expect(pulsesWithinOneSecond(start, FULL_MOTION)).toBeLessThanOrEqual(3);
    }
  });

  it("動きを減らす設定では濃さを変えない", () => {
    const samples = [0, 100, 200, 300].map((ms) => warningAlpha(ms, REDUCED_MOTION));
    expect(new Set(samples).size).toBe(1);
  });
});

describe("exitPlacement", () => {
  const hitMidMs = (profile: MotionProfile) => 1_000 + profile.flightMs + (EXIT_ANIMATION_MS - profile.flightMs) / 2;
  const timeoutMidMs = 1_000 + EXIT_ANIMATION_MS / 2;

  it("命中した人は，雪玉が届いた後に下へ沈みながら消える", () => {
    const placement = exitPlacement(exit("hit"), hitMidMs(FULL_MOTION), FULL_MOTION);
    expect(placement.dy).toBeGreaterThan(0);
    expect(placement.dx).toBe(0);
    expect(placement.alpha).toBeLessThan(1);
    expect(placement.pose.surprised).toBe(true);
  });

  it("時間切れの人は横へずれながら消える", () => {
    const placement = exitPlacement(exit("timeout"), timeoutMidMs, FULL_MOTION);
    expect(placement.dx).toBeGreaterThan(0);
    expect(placement.alpha).toBeLessThan(1);
  });

  it.each(["hit", "misfire", "timeout"] as const)(
    "動きを減らす設定では %s の退場でも動かさず，消えるだけにする",
    (reason) => {
      const nowMs = reason === "timeout" ? timeoutMidMs : hitMidMs(REDUCED_MOTION);
      const placement = exitPlacement(exit(reason), nowMs, REDUCED_MOTION);
      expect(placement.dx).toBe(0);
      expect(placement.dy).toBe(0);
      expect(placement.alpha).toBeLessThan(1);
    },
  );
});

describe("burstRadius", () => {
  it("散る雪は小さくなって消える", () => {
    expect(burstRadius(0, FULL_MOTION)).toBeGreaterThan(burstRadius(1, FULL_MOTION));
  });

  it("動きを減らす設定では大きさを変えない", () => {
    expect(burstRadius(0, REDUCED_MOTION)).toBe(burstRadius(1, REDUCED_MOTION));
  });
});

describe("watchMotionPreference", () => {
  type Listener = (event: { readonly matches: boolean }) => void;

  function fakeQuery(matches: boolean) {
    const listeners: Listener[] = [];
    return {
      matches,
      addEventListener: (_type: "change", listener: Listener) => {
        listeners.push(listener);
      },
      change: (next: boolean) => {
        for (const listener of listeners) {
          listener({ matches: next });
        }
      },
    };
  }

  it("起動時の設定に合わせた演出を適用する", () => {
    const applied: MotionProfile[] = [];
    watchMotionPreference(fakeQuery(true), (profile) => applied.push(profile));
    expect(applied).toEqual([REDUCED_MOTION]);
  });

  it("遊んでいる途中で設定が変わっても追従する", () => {
    const applied: MotionProfile[] = [];
    const query = fakeQuery(false);
    watchMotionPreference(query, (profile) => applied.push(profile));
    query.change(true);
    query.change(false);
    expect(applied).toEqual([FULL_MOTION, REDUCED_MOTION, FULL_MOTION]);
  });
});
