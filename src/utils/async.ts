/** Keep location writes, disabling direction, and cleanup in invocation order. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = tail.then(task);
    tail = next.catch(() => undefined);
    return next;
  };
}
