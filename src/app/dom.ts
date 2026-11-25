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
  };
}

export type Elements = ReturnType<typeof getElements>;

/** 値が変わったときだけ書き換え，毎フレームの無駄な再描画を避ける． */
export function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

export function setData(element: HTMLElement, key: string, value: string): void {
  if (element.dataset[key] !== value) {
    element.dataset[key] = value;
  }
}
