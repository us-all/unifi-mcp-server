import { describe, expect, it } from "vitest";
import { isRetryableError } from "../src/retry.js";
import { UniFiError } from "../src/client.js";

describe("isRetryableError", () => {
  it("treats AbortSignal.timeout TimeoutError as retryable", () => {
    expect(isRetryableError(new DOMException("The operation was aborted due to timeout", "TimeoutError"))).toBe(true);
  });

  it("treats aborts, rate limits, and 5xx as retryable", () => {
    expect(isRetryableError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isRetryableError(new UniFiError("HTTP 429: Too Many Requests", 429, {}))).toBe(true);
    expect(isRetryableError(new UniFiError("HTTP 503: Unavailable", 503, {}))).toBe(true);
  });

  it("does not retry 4xx errors except 429", () => {
    expect(isRetryableError(new UniFiError("HTTP 400: Bad Request", 400, {}))).toBe(false);
    expect(isRetryableError(new UniFiError("HTTP 401: Unauthorized", 401, {}))).toBe(false);
  });
});
