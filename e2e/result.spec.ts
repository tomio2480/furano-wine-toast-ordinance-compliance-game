import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const GAME_URL = "https://tomio2480.github.io/furano-wine-toast-ordinance-compliance-game/";
const COUNTDOWN_MS = 3_000;
const GAME_MS = 60_000;
const MARGIN_MS = 200;

async function playToResult(page: Page): Promise<void> {
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS);
  await page.clock.runFor(GAME_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "result");
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto("./");
});

test("結果画面に称号と 4 項目の内訳を出す", async ({ page }) => {
  await playToResult(page);
  await expect(page.locator("#result-title")).toHaveText(/雪まみれの幹事|乾杯見習い|乾杯係|乾杯奉行|名誉乾杯奉行/);
  const labels = page.locator("#breakdown-body th");
  await expect(labels).toHaveText(["命中", "乾杯の加点", "乾杯の減点", "誤射"]);
});

test("SNS の投稿画面へのリンクに得点と URL を含める", async ({ page }) => {
  await playToResult(page);
  const score = (await page.locator("#result-score").textContent()) ?? "";
  const x = new URL((await page.getByRole("link", { name: /X で共有/ }).getAttribute("href")) ?? "");
  expect(x.origin).toBe("https://x.com");
  expect(x.searchParams.get("text")).toContain(`合計${score}点`);
  expect(x.searchParams.get("url")).toBe(GAME_URL);
  const bluesky = await page.getByRole("link", { name: /Bluesky で共有/ }).getAttribute("href");
  expect(bluesky).toMatch(/^https:\/\/bsky\.app\/intent\/compose\?text=/);
  const threads = await page.getByRole("link", { name: /Threads で共有/ }).getAttribute("href");
  expect(threads).toMatch(/^https:\/\/www\.threads\.com\/intent\/post\?text=/);
});

test("文面をコピーできる", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await playToResult(page);
  await page.getByRole("button", { name: "文面をコピー" }).click();
  await expect(page.locator("#share-status")).toHaveText("コピーしました。");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("#乾杯条例ディフェンス");
  expect(copied).toContain(GAME_URL);
});

test("クリップボードを使えない環境ではコピーできない旨を出す", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });
  await page.goto("./");
  await playToResult(page);
  await page.getByRole("button", { name: "文面をコピー" }).click();
  await expect(page.locator("#share-status")).toHaveText(/コピーできませんでした/);
});

test("共有シートのボタンは Web Share API がある端末でだけ出す", async ({ page }) => {
  await playToResult(page);
  const hasShare = await page.evaluate(() => typeof navigator.share === "function");
  await expect(page.locator("#share-native")).toBeVisible({ visible: hasShare });
});

test("内訳と共有を含む結果画面に axe の違反がない", async ({ page }) => {
  await playToResult(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("OGP と X のカードの meta を設定し，画像を配信する", async ({ page, request }) => {
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toBe(`${GAME_URL}og-image.png`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", GAME_URL);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get("./og-image.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
});
