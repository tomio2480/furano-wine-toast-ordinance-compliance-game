import { describe, expect, it } from "vitest";
import { titleFor } from "./titles";

describe("titleFor（表 11）", () => {
  it.each([
    [-1, "雪まみれの幹事"],
    [-99_999, "雪まみれの幹事"],
    [0, "乾杯見習い"],
    [39_999, "乾杯見習い"],
    [40_000, "乾杯係"],
    [69_999, "乾杯係"],
    [70_000, "乾杯奉行"],
    [99_999, "乾杯奉行"],
    [100_000, "名誉乾杯奉行"],
  ])("%i 点は %s", (score, title) => {
    expect(titleFor(score)).toBe(title);
  });
});
