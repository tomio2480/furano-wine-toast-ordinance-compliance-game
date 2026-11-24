import { KANPAI_UNIT_SCORE } from "../config";
import { unitsFor, type KanpaiMode } from "./score";

export type KanpaiUnits = Readonly<Record<KanpaiMode, number>>;

/** 乾杯の区間の計測．同じ状態が続く間を 1 区間とし，区間ごとに切り上げる． */
export interface KanpaiMeter {
  readonly mode: KanpaiMode;
  readonly startedAtMs: number;
  /** 確定した区間の単位数の合計． */
  readonly settled: KanpaiUnits;
}

const ZERO_UNITS: KanpaiUnits = { plus: 0, minus: 0, neutral: 0 };

export function createMeter(nowMs: number): KanpaiMeter {
  return { mode: "neutral", startedAtMs: nowMs, settled: ZERO_UNITS };
}

/** 確定分に，進行中の区間を切り上げた暫定値を足して返す． */
export function meterUnits(meter: KanpaiMeter, nowMs: number): KanpaiUnits {
  const running = unitsFor(nowMs - meter.startedAtMs);
  return { ...meter.settled, [meter.mode]: meter.settled[meter.mode] + running };
}

/** 状態を保ったまま，進行中の区間を確定させて新しい区間を始める． */
export function closeSegment(meter: KanpaiMeter, nowMs: number): KanpaiMeter {
  return { mode: meter.mode, startedAtMs: nowMs, settled: meterUnits(meter, nowMs) };
}

/** 状態が変わったときだけ区間を区切る． */
export function changeMode(meter: KanpaiMeter, mode: KanpaiMode, nowMs: number): KanpaiMeter {
  if (mode === meter.mode) {
    return meter;
  }
  return { ...closeSegment(meter, nowMs), mode };
}

export function meterScore(units: KanpaiUnits): number {
  return units.plus * KANPAI_UNIT_SCORE.plus + units.minus * KANPAI_UNIT_SCORE.minus;
}
