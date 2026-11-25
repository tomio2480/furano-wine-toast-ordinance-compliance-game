/** requestAnimationFrame と同じ形の予約関数． */
export type FrameRequest = (callback: (frameMs: number) => void) => number;

/**
 * 描画ループ．動きのある画面でだけ毎フレーム描き，止まった画面では 1 回描いて休む．
 * 予約は常に 1 つまでとし，同じフレームを二重に描かない．
 */
export class FrameLoop {
  readonly #request: FrameRequest;
  readonly #draw: (frameMs: number) => void;
  #isRunning = false;
  #isScheduled = false;

  constructor(request: FrameRequest, draw: (frameMs: number) => void) {
    this.#request = request;
    this.#draw = draw;
  }

  /** 毎フレーム描き続ける． */
  run(): void {
    this.#isRunning = true;
    this.#schedule();
  }

  /** 今の状態をもう 1 回だけ描いて止まる． */
  still(): void {
    this.#isRunning = false;
    this.#schedule();
  }

  /** 止まっていても 1 回だけ描き直す．大きさが変わったときに使う． */
  refresh(): void {
    this.#schedule();
  }

  #schedule(): void {
    if (this.#isScheduled) {
      return;
    }
    this.#isScheduled = true;
    this.#request(this.#tick);
  }

  readonly #tick = (frameMs: number): void => {
    this.#isScheduled = false;
    this.#draw(frameMs);
    if (this.#isRunning) {
      this.#schedule();
    }
  };
}
