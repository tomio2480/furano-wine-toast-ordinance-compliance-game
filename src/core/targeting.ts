import { SLOTS, type Rect, type Row, type Slot } from "../config";
import type { Participant } from "./game";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** 手前に描く列ほど小さい値．重なったときは小さい値の列を優先する． */
const ROW_PRIORITY: Readonly<Record<Row, number>> = { front: 0, back: 1 };

function contains(rect: Rect, point: Point): boolean {
  const insideX = point.x >= rect.x && point.x <= rect.x + rect.width;
  const insideY = point.y >= rect.y && point.y <= rect.y + rect.height;
  return insideX && insideY;
}

function byFrontFirst(a: Slot, b: Slot): number {
  return ROW_PRIORITY[a.row] - ROW_PRIORITY[b.row];
}

const SLOT_BY_ID: ReadonlyMap<number, Slot> = new Map(SLOTS.map((slot) => [slot.id, slot]));

export function findSlot(slotId: number): Slot | undefined {
  return SLOT_BY_ID.get(slotId);
}

/** 当たり判定の中心．雪玉はここへ向けて飛ばす． */
export function hitboxCenter(slot: Slot): Point {
  return {
    x: slot.hitbox.x + slot.hitbox.width / 2,
    y: slot.hitbox.y + slot.hitbox.height / 2,
  };
}

export function participantInSlot(
  participants: readonly Participant[],
  slotId: number,
): number | undefined {
  return participants.find((participant) => participant.slotId === slotId)?.id;
}

/** 押した位置（論理座標）にいる参加者の id を返す．手前の列を優先する． */
export function targetAt(
  participants: readonly Participant[],
  point: Point,
  slots: readonly Slot[] = SLOTS,
): number | undefined {
  const hitSlots = slots.filter((slot) => contains(slot.hitbox, point)).sort(byFrontFirst);
  const occupiedIds = hitSlots
    .map((slot) => participantInSlot(participants, slot.id))
    .filter((id) => id !== undefined);
  return occupiedIds[0];
}
