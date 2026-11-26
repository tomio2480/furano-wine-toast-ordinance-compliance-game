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

/** 共有シートの代わり．呼ばれるたびに outcomes の結果を順に返し，尽きたら応答しない． */
async function stubShare(page: Page, outcomes: readonly ("resolve" | "abort" | "fail")[]): Promise<void> {
  await page.addInitScript((queue: readonly string[]) => {
    let calls = 0;
    const share = () => {
      const outcome = queue[calls];
      calls += 1;
      if (outcome === undefined) {
        return new Promise<void>(() => undefined);
      }
      if (outcome === "resolve") {
        return Promise.resolve();
      }
      return Promise.reject(new DOMException("stub", outcome === "abort" ? "AbortError" : "NotAllowedError"));
    };
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
  }, outcomes);
  await page.goto("./");
}

test("何もしなければ 0 点で「乾杯見習い」になり，内訳の合計は得点と一致する", async ({ page }) => {
  await playToResult(page);
  await expect(page.locator("#result-score")).toHaveText("0");
  await expect(page.locator("#result-title")).toHaveText("乾杯見習い");
  const labels = page.locator("#breakdown-body th");
  await expect(labels).toHaveText(["命中", "乾杯の加点", "乾杯の減点", "誤射"]);
  const points = await page.locator("#breakdown-body td:last-child").allTextContents();
  const toNumber = (text: string) => Number(text.replaceAll(",", "").replace("−", "-"));
  const total = points.reduce((sum, text) => sum + toNumber(text), 0);
  expect(String(total)).toBe(await page.locator("#result-score").textContent());
});

test("内訳の表には列の見出しがある", async ({ page }) => {
  await playToResult(page);
  await expect(page.locator(".breakdown thead th")).toHaveText(["項目", "内容", "得点"]);
});

test("共有シートで共有できたら，前の失敗の表示を消す", async ({ page }) => {
  await stubShare(page, ["fail", "resolve"]);
  await playToResult(page);
  const button = page.getByRole("button", { name: "共有する" });
  await button.click();
  await expect(page.locator("#share-status")).toHaveText(/共有できませんでした/);
  await button.click();
  await expect(page.locator("#share-status")).toHaveText("");
});

test("共有シートを閉じただけなら何も出さない", async ({ page }) => {
  await stubShare(page, ["abort"]);
  await playToResult(page);
  await page.getByRole("button", { name: "共有する" }).click();
  await expect(page.locator("#share-status")).toHaveText("");
  await expect(page.getByRole("button", { name: "共有する" })).toBeEnabled();
});

test("共有シートを開いている間は，共有ボタンを押せない", async ({ page }) => {
  await stubShare(page, []);
  await playToResult(page);
  const button = page.getByRole("button", { name: "共有する" });
  await button.click();
  await expect(button).toBeDisabled();
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
  expect(copied).toContain("#乾杯条例ガーディアン");
  expect(copied).toContain(GAME_URL);
});

test("コピーできない環境では，その旨を出し，文面を手で写せる欄を開く", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });
  await page.goto("./");
  const manual = page.getByRole("textbox", { name: /投稿文/ });
  await playToResult(page);
  await expect(manual).toBeHidden();
  await page.getByRole("button", { name: "文面をコピー" }).click();
  await expect(page.locator("#share-status")).toHaveText(/コピーできませんでした/);
  await expect(manual).toBeVisible();
  await expect(manual).toBeFocused();
  // URL は正規表現にせず，文字列として比べる（「.」が任意の 1 文字に一致しないように）．
  const written = await manual.inputValue();
  expect(written).toContain("#乾杯条例ガーディアン\n");
  expect(written.endsWith(`\n${GAME_URL}`)).toBe(true);

  await page.getByRole("button", { name: "もう一度" }).click();
  await page.clock.runFor(COUNTDOWN_MS + MARGIN_MS + GAME_MS);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "result");
  await expect(manual).toBeHidden();
});

test("結果の得点と称号は，見出しへ焦点を移した後に読み上げる", async ({ page }) => {
  // 焦点が移った瞬間のライブリージョンの文を，同期的に記録する．
  await page.evaluate(() => {
    document.addEventListener("focusin", (event) => {
      if ((event.target as HTMLElement).id === "result-heading") {
        const live = document.getElementById("result-live");
        (window as unknown as { liveAtFocus: string }).liveAtFocus = live?.textContent ?? "（なし）";
      }
    });
  });
  await playToResult(page);
  await expect(page.locator("#result-live")).toHaveText("得点は 0 点、称号は「乾杯見習い」です。");
  const liveAtFocus = await page.evaluate(() => (window as unknown as { liveAtFocus?: string }).liveAtFocus);
  expect(liveAtFocus).toBe("");
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
  const alt = await page.locator('meta[property="og:image:alt"]').getAttribute("content");
  expect(alt).toContain("非公式");
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", alt ?? "");
  const response = await request.get("./og-image.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  // PNG の IHDR は 16 バイト目から幅と高さを 4 バイトずつ持つ．
  const png = await response.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});
