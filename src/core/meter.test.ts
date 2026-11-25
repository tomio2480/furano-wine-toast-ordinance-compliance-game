import { describe, expect, it } from "vitest";
import { changeMode, closeSegment, createMeter, meterUnits } from "./meter";

describe("乾杯の区間の計測", () => {
  it("始めは中立で，単位は 0", () => {
    const meter = createMeter(0);
    expect(meter.mode).toBe("neutral");
    expect(meterUnits(meter, 5_000)).toEqual({ plus: 0, minus: 0, neutral: 50 });
  });

  it("状態が変わったときだけ区間を区切る", () => {
    const meter = changeMode(createMeter(0), "plus", 0);
    expect(changeMode(meter, "plus", 40)).toBe(meter);
  });

  it("加点 1.00 秒で 10 単位", () => {
    let meter = changeMode(createMeter(0), "plus", 0);
    meter = changeMode(meter, "neutral", 1_000);
    expect(meterUnits(meter, 1_000).plus).toBe(10);
  });

  it("区間ごとに切り上げるため，細かく切り替えると端数が積み重なる", () => {
    let meter = changeMode(createMeter(0), "plus", 0);
    meter = changeMode(meter, "neutral", 50);
    meter = changeMode(meter, "plus", 60);
    meter = changeMode(meter, "neutral", 110);
    expect(meterUnits(meter, 110).plus).toBe(2);
  });

  it("進行中の区間は切り上げた暫定値を返し，確定後の値と一致する", () => {
    const running = changeMode(createMeter(0), "minus", 0);
    const provisional = meterUnits(running, 250);
    const settled = meterUnits(changeMode(running, "neutral", 250), 250);
    expect(provisional.minus).toBe(3);
    expect(settled.minus).toBe(provisional.minus);
  });

  it("closeSegment は状態を保ったまま区間を区切る", () => {
    let meter = changeMode(createMeter(0), "plus", 0);
    meter = closeSegment(meter, 180);
    expect(meter.mode).toBe("plus");
    expect(meter.startedAtMs).toBe(180);
    expect(meterUnits(meter, 180).plus).toBe(2);
  });
});
