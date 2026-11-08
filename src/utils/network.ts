/** Bound network waits so offline requests cannot leave forms loading indefinitely. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs?: number,
): Promise<Response> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener('abort', cancel);
  const binaryUpload = init.body instanceof ArrayBuffer || ArrayBuffer.isView(init.body);
  const timer = setTimeout(cancel, timeoutMs ?? (binaryUpload ? 90_000 : 20_000));
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
  }
}
