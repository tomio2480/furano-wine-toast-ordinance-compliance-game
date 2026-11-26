import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const COUNTDOWN_MS = 3_000;
const MARGIN_MS = 200;
const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
/** 背景色 --bg（#0f1626）．焦点枠の縁取りに使う． */
const FOCUS_EDGE = "rgb(15, 22, 38)";

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto("./");
});

/** キーボードで開始する．焦点の移動が :focus-visible のまま続く． */
async function startWithKeyboard(page: Page): Promise<void> {
  await page.getByRole("button", { name: "はじめる" }).focus();
  await page.keyboard.press("Enter");
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "play");
}

/** 要素が見つからなければ失敗させ，セレクタの誤りで検査が空振りしないようにする． */
async function fontSizes(page: Page, selectors: readonly string[]): Promise<number[]> {
  return page.evaluate((list) => {
    return list.map((selector) => {
      const element = document.querySelector(selector);
      if (element === null) {
        throw new Error(`${selector} が見つかりません`);
      }
      return Number.parseFloat(getComputedStyle(element).fontSize);
    });
  }, selectors);
}

async function expectInsideStage(page: Page, target: Locator): Promise<void> {
  const stage = await page.locator("#stage").boundingBox();
  const box = await target.boundingBox();
  expect(stage).not.toBeNull();
  expect(box).not.toBeNull();
  if (stage === null || box === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(stage.x - 0.5);
  expect(box.y).toBeGreaterThanOrEqual(stage.y - 0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 0.5);
}

async function expectApart(first: Locator, second: Locator): Promise<void> {
  const a = await first.boundingBox();
  const b = await second.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  if (a === null || b === null) {
    return;
  }
  const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(overlaps).toBe(false);
}

test("ダーク配色であることをブラウザに伝える", async ({ page }) => {
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(scheme).toBe("dark");
});

test("キャンバスに重なる乾杯ボタンの焦点枠も，濃い色で縁取る", async ({ page }) => {
  await startWithKeyboard(page);
  const kanpai = page.locator("#kanpai-button");
  await expect(kanpai).toBeFocused();
  const ring = await kanpai.evaluate((element) => ({
    isVisible: element.matches(":focus-visible"),
    outline: getComputedStyle(element).outlineStyle,
    shadow: getComputedStyle(element).boxShadow,
  }));
  expect(ring.isVisible).toBe(true);
  expect(ring.outline).toBe("solid");
  expect(ring.shadow).toContain(FOCUS_EDGE);
});

test("消音ボタンはタイトルのパネルに隠れない", async ({ page }) => {
  const mute = page.getByRole("button", { name: "消音" });
  const box = await mute.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  const hitId = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.id,
    { x: box.x + box.width / 2, y: box.y + box.height - 2 },
  );
  expect(hitId).toBe("mute-button");
});

test("一時停止中は，押しても何も起きない一時停止ボタンを出さない", async ({ page }) => {
  await startWithKeyboard(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "pause");
  await expect(page.getByRole("button", { name: "一時停止", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "再開する" })).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test("利用者が文字を大きくすると，画面の文字も同じ割合で大きくなる", async ({ page }) => {
  const selectors = [".lead", ".hud", ".icon-button", ".mute-button", "#countdown-number", ".kanpai-status", ".kanpai-button"];
  const before = await fontSizes(page, selectors);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const after = await fontSizes(page, selectors);
  after.forEach((size, index) => {
    expect(size, selectors[index]).toBeCloseTo((before[index] ?? 0) * 2, 1);
  });
});

test("文字を 2 倍にしても，残り時間・得点・乾杯の表示が画面からはみ出さない", async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await startWithKeyboard(page);
  for (const target of await page.locator(".hud-item, #pause-button, #mute-button, #kanpai-status, #kanpai-button").all()) {
    await expectInsideStage(page, target);
  }
  const pause = page.locator("#pause-button");
  const mute = page.locator("#mute-button");
  await expectApart(pause, mute);
  for (const item of await page.locator(".hud-item").all()) {
    await expectApart(item, pause);
    await expectApart(item, mute);
  }
  const isLabelInside = await page
    .locator("#kanpai-button")
    .evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(isLabelInside, "乾杯ボタンの文字が枠からはみ出さない").toBe(true);
});

test("減点中の長い状態表示も，1 倍の文字なら 1 行に収まる", async ({ page }) => {
  await startWithKeyboard(page);
  const status = page.locator("#kanpai-status");
  const isOneLine = await status.evaluate((element) => {
    element.textContent = "減点中 −0167 不適合者がいます";
    const lineHeight = Number.parseFloat(getComputedStyle(element).fontSize) * 1.6;
    return element.getBoundingClientRect().height < lineHeight * 1.5 + 8;
  });
  expect(isOneLine).toBe(true);
});

test("メニューのパネルは上部の帯の下から始まり，消音ボタンに覆われない", async ({ page }) => {
  const panel = await page.locator(".panel").first().boundingBox();
  const mute = await page.getByRole("button", { name: "消音" }).boundingBox();
  expect(panel).not.toBeNull();
  expect(mute).not.toBeNull();
  if (panel === null || mute === null) {
    return;
  }
  expect(panel.y).toBeGreaterThanOrEqual(mute.y + mute.height);
});

async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error("要素が表示されていません");
  }
  return box;
}

test("注記への案内を遊び方の前に置き，注記は本文と同じ大きさで読める", async ({ page }) => {
  await expect(page.getByRole("link", { name: "注記", exact: true })).toHaveAttribute("href", "#notes-heading");
  const [lead, note] = await fontSizes(page, [".lead", ".notes p"]);
  expect(note).toBe(lead);
});

test.describe("狭い舞台", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("焦点枠の縁取り（7px）が舞台の端で切れない", async ({ page }) => {
    await startWithKeyboard(page);
    const stage = await boxOf(page.locator("#stage"));
    const mute = await boxOf(page.locator("#mute-button"));
    const kanpai = await boxOf(page.locator("#kanpai-button"));
    expect(mute.y - stage.y).toBeGreaterThanOrEqual(7);
    expect(stage.x + stage.width - (mute.x + mute.width)).toBeGreaterThanOrEqual(7);
    expect(stage.y + stage.height - (kanpai.y + kanpai.height)).toBeGreaterThanOrEqual(7);
  });
});

test.describe("横向きのスマートフォン", () => {
  test.use({ viewport: { width: 740, height: 360 } });

  test("文字を 2 倍にしても，帯は舞台の左，乾杯ボタンは右の余白に置き，参加者を覆わない", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await startWithKeyboard(page);
    const stage = await boxOf(page.locator("#stage"));
    for (const target of await page.locator(".hud-item, #pause-button, #mute-button").all()) {
      const box = await boxOf(target);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(stage.x + 0.5);
    }
    for (const target of await page.locator("#kanpai-status, #kanpai-button").all()) {
      const box = await boxOf(target);
      expect(box.x).toBeGreaterThanOrEqual(stage.x + stage.width - 0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(740);
    }
    const isLabelInside = await page
      .locator("#kanpai-button")
      .evaluate((element) => element.scrollWidth <= element.clientWidth);
    expect(isLabelInside, "乾杯ボタンの文字が枠からはみ出さない").toBe(true);
  });
});

test.describe("大きな画面", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("文字を舞台に合わせて最大 1.5 倍にし，利用者が文字を大きくすれば同じ割合で大きくなる", async ({ page }) => {
    const root = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
    const [hud = 0] = await fontSizes(page, [".hud"]);
    expect(hud).toBeGreaterThan(root * 1.2);
    expect(hud).toBeLessThanOrEqual(root * 1.5);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const [doubled = 0] = await fontSizes(page, [".hud"]);
    expect(doubled).toBeCloseTo(hud * 2, 1);
  });
});

test.describe("題字の GIF 風の動き", () => {
  const glyphs = (page: Page) => page.locator("#title-heading .pixel-logo canvas");
  const runningAnimations = (page: Page) =>
    glyphs(page).evaluateAll((elements) => elements.reduce((sum, element) => sum + element.getAnimations().length, 0));

  test("題字はドット絵で見せ，読み上げには元の文字を使う", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "乾杯条例ガーディアン" })).toBeVisible();
    await expect(page.locator("#title-heading .pixel-logo")).toHaveAttribute("aria-hidden", "true");
    await expect(glyphs(page)).toHaveCount(10);
    const rendering = await glyphs(page).first().evaluate((element) => getComputedStyle(element).imageRendering);
    expect(rendering).toBe("pixelated");
  });

  test("題字の動きは 5 秒以内に止まり，マウスを載せると最初から流れる（WCAG 2.2.2）", async ({ page }) => {
    const endTimes = await glyphs(page).evaluateAll((elements) =>
      elements.flatMap((element) =>
        element.getAnimations().map((animation) => Number(animation.effect?.getComputedTiming().endTime)),
      ),
    );
    expect(endTimes).toHaveLength(10);
    expect(Math.max(...endTimes)).toBeLessThanOrEqual(5_000);
    await glyphs(page).evaluateAll((elements) => {
      for (const animation of elements.flatMap((element) => element.getAnimations())) {
        animation.finish();
      }
    });
    expect(await runningAnimations(page)).toBe(0);
    await page.locator("#title-heading").hover();
    expect(await runningAnimations(page)).toBe(10);
  });

  test("動きを減らす設定では，題字を動かさない", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await runningAnimations(page)).toBe(0);
  });
});

test("OS の文字の大きさに合わせるよう宣言する", async ({ page }) => {
  await expect(page.locator('meta[name="text-scale"]')).toHaveAttribute("content", "scale");
});

test("メニューではピンチで拡大でき，キャンバスと乾杯ボタンだけ標準の操作を止める", async ({ page }) => {
  const touchAction = (selector: string) =>
    page.locator(selector).first().evaluate((element) => getComputedStyle(element).touchAction);
  expect(await touchAction("#stage")).toBe("manipulation");
  expect(await touchAction(".panel")).toBe("manipulation");
  expect(await touchAction("#scene")).toBe("none");
  expect(await touchAction("#kanpai-button")).toBe("none");
});
