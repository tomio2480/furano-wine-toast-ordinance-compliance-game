import { describe, expect, it } from "vitest";
import { titleFor } from "./titles";

describe("titleFor（表 11）", () => {
  it.each([
    [-1, "雪まみれの幹事"],
    [-99_999, "雪まみれの幹事"],
    [0, "乾杯見習い"],
    [2_499, "乾杯見習い"],
    [2_500, "乾杯係"],
    [5_999, "乾杯係"],
    [6_000, "乾杯奉行"],
    [9_999, "乾杯奉行"],
    [10_000, "名誉乾杯奉行"],
  ])("%i 点は %s", (score, title) => {
    expect(titleFor(score)).toBe(title);
  });
});
