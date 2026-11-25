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

const SHARE_FAILED = "共有できませんでした。ほかの方法をお試しください。";
const COPIED = "コピーしました。";
const COPY_FAILED = "コピーできませんでした。お使いのブラウザの設定をご確認ください。";

/**
 * 共有シートを開く．開いている間はボタンを押せなくし，二重に開かせない．
 * 閉じただけなら何も出さず，共有できたら前の失敗の表示を消す．
 */
function shareNatively(ui: Elements, nav: Navigator, text: ShareText): void {
  ui.shareNative.disabled = true;
  void nav
    .share({ text: text.body, url: text.url })
    .then(
      () => {
        setText(ui.shareStatus, "");
      },
      (error: unknown) => {
        setText(ui.shareStatus, isAbort(error) ? "" : SHARE_FAILED);
      },
    )
    .finally(() => {
      ui.shareNative.disabled = false;
    });
}

/**
 * 文面をクリップボードへ書く．利用者の操作の中で同期的に呼ぶ．
 * 安全でない文脈では navigator.clipboard 自体がなく例外が出るため，失敗の表示へ回す．
 */
function copyText(ui: Elements, nav: Navigator, text: ShareText): void {
  const showFailure = () => {
    setText(ui.shareStatus, COPY_FAILED);
  };
  try {
    void nav.clipboard.writeText(fullShareText(text)).then(() => {
      setText(ui.shareStatus, COPIED);
    }, showFailure);
  } catch {
    showFailure();
  }
}

/** 共有シートとコピーのボタンをつなぐ．共有シートは対応する端末でだけ出す． */
export function bindShareButtons(ui: Elements, nav: Navigator, currentText: () => ShareText): void {
  ui.shareNative.hidden = typeof nav.share !== "function";
  ui.shareNative.addEventListener("click", () => {
    shareNatively(ui, nav, currentText());
  });
  ui.shareCopy.addEventListener("click", () => {
    copyText(ui, nav, currentText());
  });
}
