import { afterEach, describe, expect, it, vi } from 'vitest';
import { SceneAbortedError, SceneQueue, Timeline } from './stage.timeline';

describe('Stage timeline', () => {
  afterEach(() => vi.useRealTimers());

  it('scales scene waits, preserves render delays and aborts every pending wait', async () => {
    vi.useFakeTimers();
    const timeline = new Timeline(() => .5);
    const scaled = vi.fn();
    const unscaled = vi.fn();
    const short = timeline.wait(100).then(scaled);
    const long = timeline.wait(100, false).then(unscaled);
    await vi.advanceTimersByTimeAsync(49);
    expect(scaled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await short;
    expect(scaled).toHaveBeenCalledOnce();
    expect(unscaled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50);
    await long;
    expect(unscaled).toHaveBeenCalledOnce();

    const pending = [timeline.wait(100), timeline.wait(200)].map((wait) =>
      expect(wait).rejects.toBeInstanceOf(SceneAbortedError));
    timeline.abort();
    await Promise.all(pending);
    await expect(timeline.wait(100)).rejects.toBeInstanceOf(SceneAbortedError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves order, drops the oldest waiting item and flags queue pressure', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async (_item: number, _fast: boolean) => {
      await new Promise<void>((done) => setTimeout(done, 100));
    });
    const queue = new SceneQueue(run);
    for (let item = 0; item < 6; item++) queue.push(item);
    expect(run.mock.calls).toEqual([[0, false]]);
    await vi.runAllTimersAsync();
    expect(run.mock.calls).toEqual([[0, false], [2, true], [3, true], [4, false], [5, false]]);

    queue.push(6);
    queue.push(7);
    queue.dispose();
    queue.push(8);
    await vi.runAllTimersAsync();
    expect(run.mock.calls.at(-1)).toEqual([6, false]);
  });
});
