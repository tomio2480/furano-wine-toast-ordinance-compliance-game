import { expect, test, type Page } from "@playwright/test";

const ORDINANCE_URL = "https://en3-jg.d1-law.com/furano/d1w_reiki/H425901010029/H425901010029.html";

/** 要件書「商標と注記」の節の文案． */
const NOTICES = [
  "非公式のファンゲームです。富良野市、富良野市ぶどう果樹研究所、コンシェルジュ フラノとは関係ありません。",
  "実際の条例は努力義務で、罰則はありません。飲み物は自由に選んでください。",
  "20歳未満の飲酒は法律で禁止されています。ぶどう果汁でも乾杯できます。",
];

test("タイトル画面に要件書の注記を全文で載せる", async ({ page }) => {
  await page.goto("./");
  const notes = page.getByRole("region", { name: "注記" });
  for (const notice of NOTICES) {
    await expect(notes).toContainText(notice);
  }
});

test("情報を保存しない旨は，配信元の記録を含めず範囲を限って書く", async ({ page }) => {
  await page.goto("./");
  const notes = page.getByRole("region", { name: "注記" });
  await expect(notes).toContainText("このゲーム自体は利用者の情報を保存せず");
  await expect(notes).toContainText("配信元の GitHub Pages は");
});

test("条例の原文へのリンクを置く", async ({ page }) => {
  await page.goto("./");
  const link = page.getByRole("link", { name: /富良野市まずはふらのワインで乾杯条例/ });
  await expect(link).toHaveAttribute("href", ORDINANCE_URL);
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("会場のモチーフ元として TechRAMEN 2026 Conference をクレジットする", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("region", { name: "注記" })).toContainText("TechRAMEN 2026 Conference");
});

/** CSP の違反をページの中の配列に集める．通知の遅れで取りこぼさないよう，最後にまとめて読む． */
async function collectViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const store = window as unknown as { cspViolations: string[] };
    store.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      store.cspViolations.push(event.violatedDirective);
    });
  });
  return () => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}

test("CSP の違反を集める仕組みが働く（対照）", async ({ page }) => {
  const violations = await collectViolations(page);
  await page.goto("./");
  await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.setAttribute("style", "color: red");
    document.body.append(probe);
  });
  await expect.poll(violations).toContain("style-src-attr");
});

test("Content Security Policy を設定し，1 ゲーム通しても違反が起きない", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.clock.install();
  const violations = await collectViolations(page);
  await page.goto("./");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  await page.getByRole("button", { name: "消音" }).click();
  await page.getByRole("button", { name: "消音" }).click();
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.clock.runFor(3_200);
  await page.keyboard.down("Space");
  await page.clock.runFor(2_000);
  await page.keyboard.up("Space");
  for (const key of ["1", "2", "3", "4", "5", "6", "7"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "再開する" }).click();
  await page.clock.runFor(3_200);
  await page.clock.runFor(60_000);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "result");
  await page.getByRole("button", { name: "文面をコピー" }).click();
  await expect(page.locator("#share-status")).toHaveText("コピーしました。");
  expect(await violations()).toEqual([]);
});
