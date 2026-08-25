import { DixaApiError } from "./errors";

/** Methods safe to replay when a request may already have reached Dixa. */
const IDEMPOTENT_METHODS = ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"];

export interface DixaRetryInfo {
  /** 1 for the first retry. */
  attempt: number;
  /** Retries still available after this one. */
  remaining: number;
  /** How long the client is about to wait, in milliseconds. */
  delayMs: number;
  /** Whether delayMs came from a Retry-After header. */
  fromRetryAfter: boolean;
  error: DixaApiError;
}

export interface DixaRetryOptions {
  /** Retries after the initial attempt. Defaults to 2 (3 requests at most). */
  retries?: number;
  /** First back-off delay, doubled per attempt. Defaults to 500ms. */
  minDelayMs?: number;
  /** Ceiling for computed back-off. Defaults to 20000ms. */
  maxDelayMs?: number;
  /**
   * Longest Retry-After this client will wait out. A longer one is not slept
   * through — the error is thrown with retryAfterMs set so the caller can
   * decide, which matters on a serverless request path. Defaults to 60000ms.
   */
  maxRetryAfterMs?: number;
  /**
   * Whether to retry 5xx and transport failures for POST. Off by default: Dixa
   * has no idempotency key, so a replayed POST can create a second
   * conversation, note or message. 429 is retried for every method regardless,
   * since a rate-limited request was rejected before it was processed.
   */
  retryNonIdempotent?: boolean;
  /** Called before each wait. Useful for logging back-off in production. */
  onRetry?: (info: DixaRetryInfo) => void;
  /** Overrides the wait itself. Intended for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface ResolvedRetryPolicy extends Required<
  Omit<DixaRetryOptions, "onRetry" | "sleep">
> {
  onRetry?: (info: DixaRetryInfo) => void;
  sleep: (ms: number) => Promise<void>;
}

export const DEFAULT_RETRY_OPTIONS: Omit<
  ResolvedRetryPolicy,
  "onRetry" | "sleep"
> = {
  retries: 2,
  minDelayMs: 500,
  maxDelayMs: 20_000,
  maxRetryAfterMs: 60_000,
  retryNonIdempotent: false,
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `false` or `0` disables retrying; a number sets the retry count. */
export function resolveRetryPolicy(
  options: DixaRetryOptions | boolean | number | undefined,
): ResolvedRetryPolicy {
  const given: DixaRetryOptions =
    options === undefined || options === true
      ? {}
      : options === false
        ? { retries: 0 }
        : typeof options === "number"
          ? { retries: options }
          : options;

  return {
    ...DEFAULT_RETRY_OPTIONS,
    ...given,
    retries: Math.max(0, given.retries ?? DEFAULT_RETRY_OPTIONS.retries),
    sleep: given.sleep ?? defaultSleep,
  };
}

/** Whether this failure is worth replaying for the given method. */
export function shouldRetry(
  error: DixaApiError,
  method: string,
  policy: ResolvedRetryPolicy,
): boolean {
  if (error.code === "ERR_CANCELED") return false;

  // A rate-limited request never reached the handler, so replaying it is safe
  // whatever the method.
  if (error.status === 429) return true;

  if (!error.isRetryable) return false;

  if (policy.retryNonIdempotent) return true;
  return IDEMPOTENT_METHODS.includes(method.toUpperCase());
}

export interface RetryDelay {
  delayMs: number;
  fromRetryAfter: boolean;
  /** Set when Retry-After asks for longer than the client will wait. */
  exceedsMaxRetryAfter: boolean;
}

/**
 * Honours Retry-After when Dixa sends one, otherwise backs off exponentially
 * with equal jitter (half the window fixed, half random) so concurrent callers
 * do not retry in lockstep.
 */
export function computeRetryDelay(
  error: DixaApiError,
  attempt: number,
  policy: ResolvedRetryPolicy,
  random: () => number = Math.random,
): RetryDelay {
  if (error.retryAfterMs !== undefined) {
    if (error.retryAfterMs > policy.maxRetryAfterMs) {
      return {
        delayMs: error.retryAfterMs,
        fromRetryAfter: true,
        exceedsMaxRetryAfter: true,
      };
    }
    return {
      delayMs: error.retryAfterMs,
      fromRetryAfter: true,
      exceedsMaxRetryAfter: false,
    };
  }

  const window = Math.min(
    policy.maxDelayMs,
    policy.minDelayMs * 2 ** (attempt - 1),
  );
  return {
    delayMs: Math.round(window / 2 + random() * (window / 2)),
    fromRetryAfter: false,
    exceedsMaxRetryAfter: false,
  };
}
