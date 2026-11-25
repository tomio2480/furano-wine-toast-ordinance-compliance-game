import { SLOTS } from "../config";

export type KeyAction =
  | { readonly kind: "kanpai" }
  | { readonly kind: "throw"; readonly slotId: number }
  | { readonly kind: "pause" };

const KANPAI: KeyAction = { kind: "kanpai" };
const PAUSE: KeyAction = { kind: "pause" };

/** 数字キー（上段とテンキー）で枠を選んで投げる． */
const THROW_KEYS = SLOTS.flatMap((slot): [string, KeyAction][] => {
  const action: KeyAction = { kind: "throw", slotId: slot.id };
  return [
    [`Digit${slot.id}`, action],
    [`Numpad${slot.id}`, action],
  ];
});

const KEY_ACTIONS: ReadonlyMap<string, KeyAction> = new Map([
  ["Space", KANPAI],
  ["KeyP", PAUSE],
  ["Escape", PAUSE],
  ...THROW_KEYS,
]);

/** KeyboardEvent.code に割り当てた操作を返す． */
export function keyAction(code: string): KeyAction | undefined {
  return KEY_ACTIONS.get(code);
}

/**
 * 乾杯以外のボタンに焦点があるとき，Space はそのボタンを押す操作に譲る．
 * 数字キーと一時停止のキーは，ボタンの標準の操作とぶつからないため譲らない．
 */
export function yieldsToFocusedButton(
  action: KeyAction,
  focused: { readonly tagName: string } | null,
  isKanpaiButton: boolean,
): boolean {
  return action.kind === "kanpai" && focused?.tagName === "BUTTON" && !isKanpaiButton;
}
