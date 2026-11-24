import { describe, expect, it } from "vitest";
import { SLOTS, type Slot } from "../config";
import type { Participant } from "./game";
import { participantInSlot, targetAt } from "./targeting";

function participant(id: number, slotId: number): Participant {
  return { id, slotId, drink: "beer", appearedAtMs: 0, leaveAtMs: 1_000 };
}

const MIN_TARGET_PX = 44;

describe("当たり判定の大きさ", () => {
  it.each(SLOTS.map((slot) => [slot.id, slot] as const))("枠 %i は 44 × 44 以上", (_id, slot) => {
    expect(slot.hitbox.width).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    expect(slot.hitbox.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  });
});

describe("targetAt", () => {
  const back: Slot = {
    id: 1,
    row: "back",
    x: 50,
    y: 100,
    scale: 1,
    hitbox: { x: 0, y: 0, width: 100, height: 100 },
  };
  const front: Slot = { ...back, id: 2, row: "front", hitbox: { x: 50, y: 50, width: 100, height: 100 } };
  const slots = [back, front];

  it("押した位置にいる参加者を返す", () => {
    expect(targetAt([participant(7, 1)], { x: 10, y: 10 }, slots)).toBe(7);
  });

  it("重なった位置では手前の列を優先する", () => {
    const people = [participant(7, 1), participant(8, 2)];
    expect(targetAt(people, { x: 75, y: 75 }, slots)).toBe(8);
  });

  it("誰もいない位置なら undefined", () => {
    expect(targetAt([participant(7, 1)], { x: 140, y: 140 }, slots)).toBeUndefined();
  });

  it("枠の範囲の端も含む", () => {
    expect(targetAt([participant(7, 1)], { x: 100, y: 100 }, slots)).toBe(7);
  });
});

describe("participantInSlot", () => {
  it("枠にいる参加者を返す", () => {
    expect(participantInSlot([participant(3, 5)], 5)).toBe(3);
  });

  it("空いた枠なら undefined", () => {
    expect(participantInSlot([participant(3, 5)], 6)).toBeUndefined();
  });
});
