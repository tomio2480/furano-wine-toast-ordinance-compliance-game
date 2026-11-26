function byId<T extends HTMLElement>(doc: Document, id: string, type: new () => T): T {
  const element = doc.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`#${id} が見つからないか，要素の種類が違います`);
  }
  return element;
}

/** 画面の要素をまとめて取得する．欠けていれば起動時に止める． */
export function getElements(doc: Document) {
  return {
    app: byId(doc, "app", HTMLElement),
    stage: byId(doc, "stage", HTMLDivElement),
    canvas: byId(doc, "scene", HTMLCanvasElement),
    timeLeft: byId(doc, "time-left", HTMLSpanElement),
    score: byId(doc, "score", HTMLSpanElement),
    countdown: byId(doc, "countdown-number", HTMLParagraphElement),
    countdownLive: byId(doc, "countdown-live", HTMLParagraphElement),
    resultLive: byId(doc, "result-live", HTMLParagraphElement),
    kanpaiStatus: byId(doc, "kanpai-status", HTMLParagraphElement),
    kanpaiButton: byId(doc, "kanpai-button", HTMLButtonElement),
    pauseButton: byId(doc, "pause-button", HTMLButtonElement),
    muteButton: byId(doc, "mute-button", HTMLButtonElement),
    startButton: byId(doc, "start-button", HTMLButtonElement),
    resumeButton: byId(doc, "resume-button", HTMLButtonElement),
    retryButton: byId(doc, "retry-button", HTMLButtonElement),
    titleButton: byId(doc, "title-button", HTMLButtonElement),
    resultHeading: byId(doc, "result-heading", HTMLHeadingElement),
    resultScore: byId(doc, "result-score", HTMLSpanElement),
    resultTitle: byId(doc, "result-title", HTMLElement),
    breakdownBody: byId(doc, "breakdown-body", HTMLTableSectionElement),
    shareNative: byId(doc, "share-native", HTMLButtonElement),
    shareX: byId(doc, "share-x", HTMLAnchorElement),
    shareBluesky: byId(doc, "share-bluesky", HTMLAnchorElement),
    shareThreads: byId(doc, "share-threads", HTMLAnchorElement),
    shareCopy: byId(doc, "share-copy", HTMLButtonElement),
    shareStatus: byId(doc, "share-status", HTMLParagraphElement),
    shareManual: byId(doc, "share-manual", HTMLDivElement),
    shareManualText: byId(doc, "share-manual-text", HTMLTextAreaElement),
  };
}

export type Elements = ReturnType<typeof getElements>;

/** 値が変わったときだけ書き換え，毎フレームの無駄な再描画を避ける． */
export function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

/** ライブリージョンのうち，announce が使う部分． */
interface LiveRegion {
  textContent: string | null;
}

/** 同じ文を書き直すまでの間．空にしたことを支援技術が拾えるだけあける． */
const REANNOUNCE_GAP_MS = 150;
const pendingRewrites = new WeakMap<LiveRegion, ReturnType<typeof setTimeout>>();

/**
 * ライブリージョンへ文を書いて読み上げさせる．
 * 同じ文を続けて書いても変化がなく読み上げられないため，いったん空にしてから書き直す．
 */
export function announce(region: LiveRegion, text: string): void {
  clearTimeout(pendingRewrites.get(region));
  pendingRewrites.delete(region);
  if (region.textContent !== text) {
    region.textContent = text;
    return;
  }
  region.textContent = "";
  const timer = setTimeout(() => {
    pendingRewrites.delete(region);
    region.textContent = text;
  }, REANNOUNCE_GAP_MS);
  pendingRewrites.set(region, timer);
}

export function setData(element: HTMLElement, key: string, value: string): void {
  if (element.dataset[key] !== value) {
    element.dataset[key] = value;
  }
}
