/**
 * 乾杯ボタンの押下元（キー，各ポインタ）を数える．
 * 1 つでも押されていれば押下中とみなす（要件書の H）．
 */
export class HoldTracker {
  readonly #sources = new Set<string>();

  get isHeld(): boolean {
    return this.#sources.size > 0;
  }

  press(source: string): void {
    this.#sources.add(source);
  }

  release(source: string): void {
    this.#sources.delete(source);
  }

  releaseAll(): void {
    this.#sources.clear();
  }
}
