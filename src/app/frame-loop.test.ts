import { describe, expect, it } from "vitest";
import { FrameLoop } from "./frame-loop";

/** requestAnimationFrame の代わり．flush で予約済みのフレームを 1 回分だけ進める． */
function fakeFrames() {
  let queue: ((frameMs: number) => void)[] = [];
  return {
    request: (callback: (frameMs: number) => void) => {
      queue.push(callback);
      return queue.length;
    },
    flush: (frameMs: number) => {
      const due = queue;
      queue = [];
      for (const callback of due) {
        callback(frameMs);
      }
    },
    get pending() {
      return queue.length;
    },
  };
}

function setup() {
  const frames = fakeFrames();
  const drawn: number[] = [];
  const loop = new FrameLoop(frames.request, (frameMs) => drawn.push(frameMs));
  return { frames, drawn, loop };
}

describe("FrameLoop", () => {
  it("run の間は毎フレーム描く", () => {
    const { frames, drawn, loop } = setup();
    loop.run();
    frames.flush(16);
    frames.flush(32);
    expect(drawn).toEqual([16, 32]);
    expect(frames.pending).toBe(1);
  });

  it("still にすると，止まった状態を 1 回だけ描いて止まる", () => {
    const { frames, drawn, loop } = setup();
    loop.run();
    frames.flush(16);
    loop.still();
    frames.flush(32);
    frames.flush(48);
    expect(drawn).toEqual([16, 32]);
    expect(frames.pending).toBe(0);
  });

  it("止まっているときの refresh は 1 回だけ描き直す", () => {
    const { frames, drawn, loop } = setup();
    loop.refresh();
    frames.flush(16);
    frames.flush(32);
    expect(drawn).toEqual([16]);
  });

  it("同じフレームを二重に予約しない", () => {
    const { frames, loop } = setup();
    loop.run();
    loop.run();
    loop.refresh();
    loop.still();
    expect(frames.pending).toBe(1);
  });

  it("描画の途中で still になっても，そのフレームの後に 1 回だけ描く", () => {
    const frames = fakeFrames();
    const drawn: number[] = [];
    const loop: FrameLoop = new FrameLoop(frames.request, (frameMs) => {
      drawn.push(frameMs);
      if (frameMs === 16) {
        loop.still();
      }
    });
    loop.run();
    frames.flush(16);
    frames.flush(32);
    frames.flush(48);
    expect(drawn).toEqual([16, 32]);
  });

  it("描画の途中で run になっても，フレームを二重に予約しない", () => {
    const frames = fakeFrames();
    const loop: FrameLoop = new FrameLoop(frames.request, () => {
      loop.run();
    });
    loop.run();
    frames.flush(16);
    expect(frames.pending).toBe(1);
  });
});
