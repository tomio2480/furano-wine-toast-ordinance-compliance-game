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
  // 通信を使わない．github.io の同じオリジンにある他のページへも送らせない．
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  // 文字列から HTML やスクリプトを作る操作を拒む．DOM へは textContent でしか書かない．
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join("; ");

/** 文字コードの宣言は先頭 1024 バイトに置く必要があるため，CSP はその直後に差し込む． */
const CHARSET_META = '<meta charset="utf-8" />';

function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml(html) {
      if (!html.includes(CHARSET_META)) {
        throw new Error(`index.html に ${CHARSET_META} が見つからないため，CSP を差し込めません`);
      }
      const csp = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
      return html.replace(CHARSET_META, `${CHARSET_META}\n    ${csp}`);
    },
  };
}

export default defineConfig({
  base: PAGES_BASE,
  plugins: [contentSecurityPolicy()],
  build: {
    target: "es2022",
    // 初期のチャンクは 1 つで先読みするものがない．ポリフィルは connect-src 'none' とも食い違う．
    modulePreload: { polyfill: false },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
