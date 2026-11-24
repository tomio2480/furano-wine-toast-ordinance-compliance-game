import type { GameResult } from "../core/game";
import { titleFor } from "../core/titles";
import { buildShareText, fullShareText, shareLinks, type ShareText } from "../share/share";
import { breakdownRows, type BreakdownRow } from "./breakdown";
import { setText, type Elements } from "./dom";
import { formatScore } from "./format";

function rowElement(doc: Document, row: BreakdownRow): HTMLTableRowElement {
  const tr = doc.createElement("tr");
  const label = doc.createElement("th");
  label.scope = "row";
  label.textContent = row.label;
  const detail = doc.createElement("td");
  detail.textContent = row.detail;
  const points = doc.createElement("td");
  points.textContent = row.points;
  tr.append(label, detail, points);
  return tr;
}

/** 結果画面を埋める．文字はすべて textContent で入れ，HTML として解釈させない． */
export function renderResult(ui: Elements, result: GameResult): ShareText {
  const text = buildShareText(result);
  const links = shareLinks(text);
  const doc = ui.app.ownerDocument;
  setText(ui.resultScore, formatScore(result.score));
  setText(ui.resultTitle, titleFor(result.score));
  ui.breakdownBody.replaceChildren(...breakdownRows(result).map((row) => rowElement(doc, row)));
  ui.shareX.href = links.x;
  ui.shareBluesky.href = links.bluesky;
  ui.shareThreads.href = links.threads;
  setText(ui.shareStatus, "");
  return text;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** 共有シートとコピーのボタンをつなぐ．共有シートは対応する端末でだけ出す． */
export function bindShareButtons(ui: Elements, nav: Navigator, currentText: () => ShareText): void {
  ui.shareNative.hidden = typeof nav.share !== "function";
  ui.shareNative.addEventListener("click", () => {
    const text = currentText();
    nav.share({ text: text.body, url: text.url }).catch((error: unknown) => {
      setText(ui.shareStatus, isAbort(error) ? "" : "共有できませんでした。ほかの方法をお試しください。");
    });
  });
  ui.shareCopy.addEventListener("click", () => {
    // 安全でない文脈では navigator.clipboard 自体がなく，同期的に例外が出る．
    // Promise の中で呼び，その場合も失敗の表示へ回す．
    Promise.resolve()
      .then(() => nav.clipboard.writeText(fullShareText(currentText())))
      .then(
      () => {
        setText(ui.shareStatus, "コピーしました。");
      },
      () => {
        setText(ui.shareStatus, "コピーできませんでした。お使いのブラウザの設定をご確認ください。");
      },
    );
  });
}
