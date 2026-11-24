import {
  advance,
  createGame,
  setHeld,
  throwAt,
  type GameOptions,
  type GameState,
} from "../core/game";
import type { Random } from "../core/random";

/** ms 単位の整数を返す単調増加の時計． */
export type Clock = () => number;

/**
 * 実時間をプレイの経過時間へ写す．走らせている間だけ時間を進める．
 * 入力は現在の時刻まで進めてから反映し，判定の時刻をずらさない．
 */
export class PlaySession {
  #game: GameState;
  #lastSyncMs: number | undefined;
  readonly #clock: Clock;
  readonly #random: Random;
  readonly #options: GameOptions;

  constructor(clock: Clock, random: Random, options: GameOptions = {}) {
    this.#clock = clock;
    this.#random = random;
    this.#options = options;
    this.#game = createGame(options);
  }

  get game(): GameState {
    return this.#game;
  }

  get isRunning(): boolean {
    return this.#lastSyncMs !== undefined;
  }

  newGame(): void {
    this.#game = createGame(this.#options);
    this.#lastSyncMs = undefined;
  }

  run(): void {
    this.#lastSyncMs = this.#clock();
  }

  /** 一時停止や時間切れで止める．押下は解除したものとして扱う． */
  halt(): void {
    this.sync();
    this.#game = setHeld(this.#game, false);
    this.#lastSyncMs = undefined;
  }

  sync(): void {
    if (this.#lastSyncMs === undefined) {
      return;
    }
    const now = this.#clock();
    const toMs = this.#game.timeMs + (now - this.#lastSyncMs);
    this.#game = advance(this.#game, toMs, this.#random);
    this.#lastSyncMs = now;
  }

  setHeld(isHeld: boolean): void {
    this.sync();
    this.#game = setHeld(this.#game, isHeld);
  }

  throwAt(participantId: number): void {
    this.sync();
    this.#game = throwAt(this.#game, participantId);
  }
}
