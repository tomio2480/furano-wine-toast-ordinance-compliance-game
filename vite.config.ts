import { defineConfig } from "vitest/config";

// GitHub Pages のプロジェクトサイトはリポジトリ名のパスで配信される．
const PAGES_BASE = "/furano-wine-toast-ordinance-compliance-game/";

export default defineConfig({
  base: PAGES_BASE,
  build: {
    target: "es2022",
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
