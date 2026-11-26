/**
 * 遊んでいる画面で乾杯に使った Space を，離すまで追う．
 * 押したままマウスで一時停止すると，焦点が再開ボタンへ移る．
 * そのままでは自動の繰り返しと離す操作がそのボタンを押し，意図せず再開してしまう．
 */
export class HeldSpaceGuard {
  #held = false;

  /** 遊んでいる画面で Space を乾杯に使ったときに呼ぶ． */
  start(): void {
    this.#held = true;
  }

  /**
   * メニューの画面での Space の keydown を止めるか．押し続けている間の繰り返しだけ止める．
   * 押し直した Space は，離す操作を取りこぼしていても，ボタンの操作として通す．
   */
  swallowsKeyDown(isRepeat: boolean): boolean {
    if (!isRepeat) {
      this.#held = false;
    }
    return this.#held;
  }

  /** Space の keyup を止めるか．乾杯に使った Space を離したときだけ止める． */
  swallowsKeyUp(): boolean {
    const wasHeld = this.#held;
    this.#held = false;
    return wasHeld;
  }
}
