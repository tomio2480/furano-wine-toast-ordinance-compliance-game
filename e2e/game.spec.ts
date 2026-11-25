import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const COUNTDOWN_MS = 3_000;
const GAME_MS = 60_000;
const MARGIN_MS = 200;
const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const pageErrors = new WeakMap<Page, Error[]>();

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error));
  await page.clock.install();
  await page.goto("./");
});

test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function startPlaying(page: Page): Promise<void> {
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "play");
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

test("タイトル画面にゲーム名と開始ボタンがある", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "乾杯条例ディフェンス" })).toBeVisible();
  await expect(page.getByRole("button", { name: "はじめる" })).toBeVisible();
});

test("タイトル画面に axe の違反がない", async ({ page }) => {
  await expectNoAxeViolations(page);
});

test("開始するとカウントダウンを経てプレイに入る", async ({ page }) => {
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page.locator("#countdown-number")).toHaveText("3");
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "play");
  await expect(page.locator("#time-left")).toHaveText("60");
  await expect(page.getByRole("button", { name: /乾杯/ })).toBeVisible();
});

test("Space の長押しで乾杯の状態表示が変わり，離すと戻る", async ({ page }) => {
  await startPlaying(page);
  await page.clock.runFor(1_000);
  const status = page.locator("#kanpai-status");
  await page.keyboard.down("Space");
  await page.clock.runFor(100);
  await expect(status).toHaveText(/加点中|減点中/);
  await page.keyboard.up("Space");
  await page.clock.runFor(100);
  await expect(status).toHaveText("長押しで乾杯");
});

test("ウィンドウがフォーカスを失うと乾杯の押下を終える", async ({ page }) => {
  await startPlaying(page);
  await page.clock.runFor(1_000);
  const status = page.locator("#kanpai-status");
  await page.keyboard.down("Space");
  await page.clock.runFor(100);
  await expect(status).toHaveText(/加点中|減点中/);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(100);
  await expect(status).toHaveText("長押しで乾杯");
});

test("乾杯ボタンをマウスで押している間だけ乾杯する", async ({ page }) => {
  await startPlaying(page);
  await page.clock.runFor(1_000);
  const status = page.locator("#kanpai-status");
  await page.locator("#kanpai-button").hover();
  await page.mouse.down();
  await page.clock.runFor(100);
  await expect(status).toHaveText(/加点中|減点中/);
  await page.mouse.up();
  await page.clock.runFor(100);
  await expect(status).toHaveText("長押しで乾杯");
});

test("Escape で一時停止し，再開するとカウントダウンに戻る", async ({ page }) => {
  await startPlaying(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "pause");
  const timeLeft = await page.locator("#time-left").textContent();
  await page.clock.runFor(5_000);
  await page.getByRole("button", { name: "再開する" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "countdown");
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "play");
  await expect(page.locator("#time-left")).toHaveText(timeLeft ?? "");
});

test("タブが隠れると一時停止する", async ({ page }) => {
  await startPlaying(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "pause");
});

test("ほかのボタンに焦点があれば，Space はそのボタンを押す", async ({ page }) => {
  await startPlaying(page);
  const mute = page.getByRole("button", { name: "消音" });
  await mute.focus();
  await page.keyboard.press("Space");
  await page.clock.runFor(100);
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#kanpai-status")).toHaveText("長押しで乾杯");
});

test("止まった画面では描き続けず，遊んでいる間だけ描き続ける", async ({ page }) => {
  await page.addInitScript(() => {
    const counter = window as unknown as { frameRequests: number };
    const request = window.requestAnimationFrame.bind(window);
    counter.frameRequests = 0;
    window.requestAnimationFrame = (callback) => {
      counter.frameRequests += 1;
      return request(callback);
    };
  });
  await page.reload();
  const frameRequests = () =>
    page.evaluate(() => (window as unknown as { frameRequests: number }).frameRequests);

  await page.clock.runFor(1_000);
  const atTitle = await frameRequests();
  await page.clock.runFor(1_000);
  expect(await frameRequests()).toBe(atTitle);

  await startPlaying(page);
  const inPlay = await frameRequests();
  await page.clock.runFor(1_000);
  expect(await frameRequests()).toBeGreaterThan(inPlay);

  await page.keyboard.press("Escape");
  await page.clock.runFor(100);
  const paused = await frameRequests();
  await page.clock.runFor(1_000);
  expect(await frameRequests()).toBe(paused);
});

test("数字キーで投げても動作が止まらない", async ({ page }) => {
  await startPlaying(page);
  await page.clock.runFor(1_500);
  for (const key of ["1", "2", "3", "4", "5", "6", "7"]) {
    await page.keyboard.press(key);
  }
  await page.clock.runFor(500);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "play");
});

test("時間切れで結果画面に移り，axe の違反がない", async ({ page }) => {
  await startPlaying(page);
  await page.clock.runFor(GAME_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "result");
  await expect(page.locator("#result-score")).toHaveText(/^-?[\d,]+$/);
  await expectNoAxeViolations(page);
});

test("結果画面からもう一度遊べる", async ({ page }) => {
  await startPlaying(page);
  await page.clock.runFor(GAME_MS);
  await page.getByRole("button", { name: "もう一度" }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "countdown");
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS);
  await expect(page.locator("#time-left")).toHaveText("60");
});
