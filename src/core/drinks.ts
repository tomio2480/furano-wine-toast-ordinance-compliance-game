export interface Drink {
  /** 読み上げや結果表示に使う名前． */
  readonly name: string;
  /** 乾杯条例に適合する飲み物か． */
  readonly compliant: boolean;
}

/** 飲み物の一覧（要件書の表 2）．ゲーム内のワインはすべてふらのワインとみなす． */
export const DRINKS = {
  wineRed: { name: "ふらのワイン（赤）", compliant: true },
  wineWhite: { name: "ふらのワイン（白）", compliant: true },
  wineRose: { name: "ふらのワイン（ロゼ）", compliant: true },
  grapeJuice: { name: "ふらのぶどう果汁", compliant: true },
  beer: { name: "ビール", compliant: false },
  sake: { name: "日本酒", compliant: false },
  highball: { name: "ハイボール", compliant: false },
  oolongTea: { name: "ウーロン茶", compliant: false },
  cola: { name: "コーラ", compliant: false },
  hotCoffee: { name: "ホットコーヒー", compliant: false },
} as const satisfies Record<string, Drink>;

export type DrinkId = keyof typeof DRINKS;

const DRINK_IDS = Object.keys(DRINKS) as DrinkId[];

export function isCompliant(id: DrinkId): boolean {
  return DRINKS[id].compliant;
}

export const COMPLIANT_DRINKS: readonly DrinkId[] = DRINK_IDS.filter(isCompliant);

export const NON_COMPLIANT_DRINKS: readonly DrinkId[] = DRINK_IDS.filter(
  (id) => !isCompliant(id),
);
