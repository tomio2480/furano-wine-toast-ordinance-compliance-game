export type Build = "slim" | "regular" | "broad";
export type HairStyle = "short" | "bob" | "long" | "bun" | "cap" | "shaved";
export type Outfit = "sweater" | "shirt" | "jacket" | "hoodie" | "dress";

/** 参加者の見た目．実在の人物や既存のキャラクターに似せない汎用の組み合わせとする． */
export interface Appearance {
  readonly build: Build;
  readonly hairStyle: HairStyle;
  readonly outfit: Outfit;
  readonly skin: string;
  readonly hair: string;
  readonly outfitColor: string;
  readonly scarf: string;
}

const BUILDS: readonly Build[] = ["slim", "regular", "broad"];
const HAIR_STYLES: readonly HairStyle[] = ["short", "bob", "long", "bun", "cap", "shaved"];
const OUTFITS: readonly Outfit[] = ["sweater", "shirt", "jacket", "hoodie", "dress"];
const SKINS = ["#f6d7bf", "#e8b996", "#c98f68", "#a26a45", "#7a4b2f"];
const HAIRS = ["#2b2220", "#5a3a26", "#8a5a34", "#c9a066", "#9a9a9a"];
const OUTFIT_COLORS = ["#c0392b", "#2e7d5b", "#3c5a9a", "#d68a1f", "#7b4f9e", "#5d6d7e", "#b5485d"];
const SCARVES = ["#f1e6d0", "#e0b04a", "#7fb3d5", "#d98880", "#a9cce3"];

function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new RangeError("見た目の候補が空です");
  }
  return item;
}

/** 参加者の id から見た目を決める．候補ごとに歩幅を変え，組み合わせを散らす． */
export function appearanceFor(id: number): Appearance {
  return {
    build: cycle(BUILDS, id),
    hairStyle: cycle(HAIR_STYLES, id * 5 + 1),
    outfit: cycle(OUTFITS, id * 3 + 2),
    skin: cycle(SKINS, id * 2 + 3),
    hair: cycle(HAIRS, id * 3),
    outfitColor: cycle(OUTFIT_COLORS, id * 4 + 1),
    scarf: cycle(SCARVES, id * 2),
  };
}
