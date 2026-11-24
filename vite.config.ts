import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// GitHub Pages のプロジェクトサイトはリポジトリ名のパスで配信される．
const PAGES_BASE = "/furano-wine-toast-ordinance-compliance-game/";

/**
 * 公開版の Content Security Policy．外部から読み込むものはない．
 * 開発サーバーは HMR のためにインラインのスタイルと WebSocket を使うため，ビルド時だけ付ける．
 * meta 要素では frame-ancestors を指定できない．
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  base: PAGES_BASE,
  plugins: [contentSecurityPolicy()],
  build: {
    target: "es2022",
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
