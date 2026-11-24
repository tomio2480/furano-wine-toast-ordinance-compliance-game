import { expect, test } from "@playwright/test";

const ORDINANCE_URL = "https://en3-jg.d1-law.com/furano/d1w_reiki/H425901010029/H425901010029.html";

test("タイトル画面に注記を載せる", async ({ page }) => {
  await page.goto("./");
  const notes = page.getByRole("region", { name: "注記" });
  await expect(notes).toContainText("非公式のファンゲームです。");
  await expect(notes).toContainText("富良野市、富良野市ぶどう果樹研究所、コンシェルジュ フラノとは関係ありません。");
  await expect(notes).toContainText("実際の条例は努力義務で、罰則はありません。");
  await expect(notes).toContainText("20歳未満の飲酒は法律で禁止されています。");
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

test("Content Security Policy を設定し，1 ゲーム通しても違反が起きない", async ({ page }) => {
  const violations: string[] = [];
  await page.clock.install();
  await page.exposeFunction("reportViolation", (directive: string) => {
    violations.push(directive);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      void (window as unknown as { reportViolation: (d: string) => Promise<void> }).reportViolation(
        event.violatedDirective,
      );
    });
  });
  await page.goto("./");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.clock.runFor(3_200);
  await page.keyboard.down("Space");
  await page.clock.runFor(2_000);
  await page.keyboard.up("Space");
  await page.clock.runFor(60_000);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "result");
  expect(violations).toEqual([]);
});
