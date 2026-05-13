const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  const name = (error as { name?: string }).name;
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    status === 429 ||
    (status !== undefined && status >= 500 && status < 600) ||
    status === undefined
  );
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = isRetryableError(error);

      if (!retryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 300);
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Retry failed");
}
