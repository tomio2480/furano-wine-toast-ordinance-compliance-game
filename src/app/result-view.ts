import type { GameResult } from "../core/game";
import { titleFor } from "../core/titles";
import { buildShareText, fullShareText, shareLinks, type ShareText } from "../share/share";
import { breakdownRows, type BreakdownRow } from "./breakdown";
import { announce, setText, type Elements } from "./dom";
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

/**
 * 結果画面を埋める．文字はすべて textContent で入れ，HTML として解釈させない．
 * 焦点は見出しへ移すため，得点と称号はライブリージョンで読み上げる．
 */
export function renderResult(ui: Elements, result: GameResult): ShareText {
  const text = buildShareText(result);
  const links = shareLinks(text);
  const doc = ui.app.ownerDocument;
  const score = formatScore(result.score);
  const title = titleFor(result.score);
  setText(ui.resultScore, score);
  setText(ui.resultTitle, title);
  ui.breakdownBody.replaceChildren(...breakdownRows(result).map((row) => rowElement(doc, row)));
  ui.shareX.href = links.x;
  ui.shareBluesky.href = links.bluesky;
  ui.shareThreads.href = links.threads;
  setText(ui.shareStatus, "");
  ui.shareManual.hidden = true;
  ui.shareManualText.value = "";
  announce(ui.resultLive, `得点は ${score} 点、称号は「${title}」です。`);
  return text;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const SHARE_FAILED = "共有できませんでした。ほかの方法をお試しください。";
const COPIED = "コピーしました。";
const COPY_FAILED = "コピーできませんでした。下の欄の文面を選んでコピーしてください。";

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
        if (isAbort(error)) {
          setText(ui.shareStatus, "");
          return;
        }
        announce(ui.shareStatus, SHARE_FAILED);
      },
    )
    .finally(() => {
      ui.shareNative.disabled = false;
    });
}

/** コピーできなかった文面を欄に出し，選んだ状態にして手で写せるようにする． */
function showManualCopy(ui: Elements, text: ShareText): void {
  ui.shareManualText.value = fullShareText(text);
  ui.shareManual.hidden = false;
  ui.shareManualText.focus();
  ui.shareManualText.select();
}

/**
 * 文面をクリップボードへ書く．利用者の操作の中で同期的に呼ぶ．
 * 安全でない文脈では navigator.clipboard 自体がなく例外が出るため，失敗の表示へ回す．
 */
function copyText(ui: Elements, nav: Navigator, text: ShareText): void {
  const showFailure = () => {
    announce(ui.shareStatus, COPY_FAILED);
    showManualCopy(ui, text);
  };
  try {
    void nav.clipboard.writeText(fullShareText(text)).then(() => {
      announce(ui.shareStatus, COPIED);
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
