import { describe, expect, it } from "vitest";
import { FIGURE, NARROWEST_STAGE_CSS_PX, SLOTS, STAGE, TABLE, type Slot } from "../config";
import type { Participant } from "./game";
import { findSlot, hitboxCenter, participantInSlot, targetAt } from "./targeting";

function participant(id: number, slotId: number): Participant {
  return { id, slotId, drink: "beer", appearedAtMs: 0, leaveAtMs: 1_000 };
}

const MIN_TARGET_CSS_PX = 44;
const bySlot = SLOTS.map((slot) => [slot.id, slot] as const);

describe("当たり判定の大きさと位置", () => {
  it.each(bySlot)("枠 %i は，最も狭い舞台でも 44 × 44 CSS px 以上", (_id, slot) => {
    const cssPerUnit = NARROWEST_STAGE_CSS_PX / STAGE.width;
    expect(slot.hitbox.width * cssPerUnit).toBeGreaterThanOrEqual(MIN_TARGET_CSS_PX);
    expect(slot.hitbox.height * cssPerUnit).toBeGreaterThanOrEqual(MIN_TARGET_CSS_PX);
  });

  it.each(bySlot)("枠 %i は，絵の外形（飲み物と頭の上の飾りを含む）を覆う", (_id, slot) => {
    const { hitbox } = slot;
    expect(hitbox.x).toBeLessThanOrEqual(slot.x + FIGURE.left * slot.scale);
    expect(hitbox.x + hitbox.width).toBeGreaterThanOrEqual(slot.x + FIGURE.right * slot.scale);
    expect(hitbox.y).toBeLessThanOrEqual(slot.y + FIGURE.top * slot.scale);
  });

  it.each(bySlot)("枠 %i は，舞台の外にはみ出さない", (_id, slot) => {
    expect(slot.hitbox.x).toBeGreaterThanOrEqual(0);
    expect(slot.hitbox.x + slot.hitbox.width).toBeLessThanOrEqual(STAGE.width);
  });

  it("奥の列は，テーブルに隠れた足もとを当たり判定に含めない", () => {
    for (const slot of SLOTS.filter((item) => item.row === "back")) {
      expect(slot.hitbox.y + slot.hitbox.height).toBe(TABLE.top);
    }
  });

  it("同じ列の当たり判定は重ならない", () => {
    for (const row of ["back", "front"] as const) {
      const boxes = SLOTS.filter((slot) => slot.row === row).map((slot) => slot.hitbox);
      for (const [left, right] of boxes.slice(0, -1).map((box, index) => [box, boxes[index + 1]] as const)) {
        expect(left.x + left.width).toBeLessThanOrEqual(right?.x ?? Number.POSITIVE_INFINITY);
      }
    }
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

describe("findSlot", () => {
  it("id から枠を返す", () => {
    expect(findSlot(5)?.row).toBe("front");
  });

  it("ない枠は undefined", () => {
    expect(findSlot(99)).toBeUndefined();
  });
});

describe("hitboxCenter", () => {
  it("当たり判定の中心を返す", () => {
    const slot: Slot = {
      id: 1,
      row: "front",
      x: 50,
      y: 100,
      scale: 1,
      hitbox: { x: 20, y: 40, width: 60, height: 40 },
    };
    expect(hitboxCenter(slot)).toEqual({ x: 50, y: 60 });
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
