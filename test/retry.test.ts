import { describe, expect, it, vi } from "vitest";
import { Dixa } from "../src/index";
import { DixaClient } from "../src/client";
import { DixaApiError, isDixaApiError } from "../src/errors";
import {
  computeRetryDelay,
  DixaRetryInfo,
  resolveRetryPolicy,
  shouldRetry,
} from "../src/retry";
import { createMockAdapter, MockReply } from "./helpers/mockAdapter";

async function captureError(promise: Promise<unknown>): Promise<DixaApiError> {
  try {
    await promise;
  } catch (error) {
    if (!isDixaApiError(error)) throw error;
    return error;
  }
  throw new Error("expected the request to reject");
}

/**
 * Records the delays the client asks for and returns immediately, so the tests
 * assert the back-off it computed without waiting it out.
 */
function recordingSleep() {
  const waited: number[] = [];
  return {
    waited,
    sleep: async (ms: number) => {
      waited.push(ms);
    },
  };
}

function clientFor(
  replies: MockReply[],
  retry: Record<string, unknown> = {},
) {
  const { adapter, requests } = createMockAdapter(replies);
  const { waited, sleep } = recordingSleep();
  const onRetry = vi.fn<(info: DixaRetryInfo) => void>();
  const client = new DixaClient("token", {
    adapter,
    retry: { sleep, onRetry, ...retry },
  });
  return { client, requests, waited, onRetry };
}

describe("retry", () => {
  it("retries a 429 and returns the eventual success", async () => {
    const { client, requests, waited } = clientFor([
      { status: 429, headers: { "retry-after": "2" } },
      { data: { data: { id: "a-1" } } },
    ]);

    await expect(client.get("v1/agents/a-1")).resolves.toEqual({ id: "a-1" });
    expect(requests).toHaveLength(2);
    expect(waited).toEqual([2000]);
  });

  it("honours Retry-After in seconds rather than its own back-off", async () => {
    const { client, waited, onRetry } = clientFor([
      { status: 429, headers: { "retry-after": "7" } },
      { data: { data: [] } },
    ]);

    await client.get("v1/agents");

    expect(waited).toEqual([7000]);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0]?.[0]).toMatchObject({
      attempt: 1,
      delayMs: 7000,
      fromRetryAfter: true,
    });
  });

  it("honours a Retry-After given as an HTTP-date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    try {
      const { client, waited } = clientFor([
        { status: 429, headers: { "retry-after": "Thu, 01 Jan 2026 00:00:04 GMT" } },
        { data: { data: [] } },
      ]);

      await client.get("v1/agents");

      expect(waited).toEqual([4000]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries 5xx with exponential back-off when there is no Retry-After", async () => {
    const { client, requests, waited } = clientFor(
      [{ status: 503 }, { status: 503 }, { data: { data: [] } }],
      { minDelayMs: 1000, retries: 3 },
    );

    await client.get("v1/agents");

    expect(requests).toHaveLength(3);
    expect(waited).toHaveLength(2);
    // equal jitter: half the window fixed, half random
    expect(waited[0]).toBeGreaterThanOrEqual(500);
    expect(waited[0]).toBeLessThanOrEqual(1000);
    expect(waited[1]).toBeGreaterThanOrEqual(1000);
    expect(waited[1]).toBeLessThanOrEqual(2000);
  });

  it("retries a transport failure", async () => {
    const { client, requests } = clientFor([
      { error: { message: "socket hang up", code: "ECONNRESET" } },
      { data: { data: { id: "a-1" } } },
    ]);

    await expect(client.get("v1/agents/a-1")).resolves.toEqual({ id: "a-1" });
    expect(requests).toHaveLength(2);
  });

  it("gives up after the configured number of retries and throws the last error", async () => {
    const { client, requests } = clientFor(
      [{ status: 503 }, { status: 503 }, { status: 503 }],
      { retries: 2 },
    );

    const error = await captureError(client.get("v1/agents"));

    expect(error.status).toBe(503);
    expect(requests).toHaveLength(3);
  });

  it("does not retry a 401 or a 404", async () => {
    const unauthorized = clientFor([{ status: 401 }]);
    await expect(unauthorized.client.get("v1/agents")).rejects.toSatisfy(isDixaApiError);
    expect(unauthorized.requests).toHaveLength(1);

    const missing = clientFor([{ status: 404 }]);
    await expect(missing.client.get("v1/agents/nope")).rejects.toSatisfy(isDixaApiError);
    expect(missing.requests).toHaveLength(1);
  });

  it("does not replay a POST on a 5xx by default", async () => {
    // Dixa has no idempotency key, so a replayed POST can create a second
    // conversation or note.
    const { client, requests } = clientFor([{ status: 502 }]);

    await expect(client.post("v1/conversations", {})).rejects.toSatisfy(isDixaApiError);
    expect(requests).toHaveLength(1);
  });

  it("replays a POST on a 5xx when retryNonIdempotent is on", async () => {
    const { client, requests } = clientFor(
      [{ status: 502 }, { status: 201, data: { data: { id: "c-1" } } }],
      { retryNonIdempotent: true },
    );

    await expect(client.post("v1/conversations", {})).resolves.toEqual({ id: "c-1" });
    expect(requests).toHaveLength(2);
  });

  it("replays a POST on a 429 even by default, since it was never processed", async () => {
    const { client, requests } = clientFor([
      { status: 429, headers: { "retry-after": "1" } },
      { status: 201, data: { data: { id: "c-1" } } },
    ]);

    await expect(client.post("v1/conversations", {})).resolves.toEqual({ id: "c-1" });
    expect(requests).toHaveLength(2);
  });

  it("refuses to wait out a Retry-After longer than maxRetryAfterMs", async () => {
    const { client, requests, waited } = clientFor(
      [{ status: 429, headers: { "retry-after": "600" } }],
      { maxRetryAfterMs: 30_000 },
    );

    const error = await captureError(client.get("v1/agents"));

    expect(error.status).toBe(429);
    expect(error.retryAfterMs).toBe(600_000);
    expect(requests).toHaveLength(1);
    expect(waited).toEqual([]);
  });

  it("caps computed back-off at maxDelayMs", async () => {
    const { client, waited } = clientFor(
      [{ status: 503 }, { status: 503 }, { status: 503 }, { data: { data: [] } }],
      { retries: 3, minDelayMs: 1000, maxDelayMs: 2000 },
    );

    await client.get("v1/agents");

    for (const delay of waited) expect(delay).toBeLessThanOrEqual(2000);
  });

  it("retries inside paginate as well", async () => {
    const { client, requests } = clientFor([
      { data: { data: [{ id: "a" }], meta: { next: "/v1/agents?pageKey=k2" } } },
      { status: 429, headers: { "retry-after": "1" } },
      { data: { data: [{ id: "b" }] } },
    ]);

    await expect(client.paginate("v1/agents")).resolves.toEqual([
      { id: "a" },
      { id: "b" },
    ]);
    expect(requests).toHaveLength(3);
  });

  it("can be disabled entirely", async () => {
    const { adapter, requests } = createMockAdapter([{ status: 503 }]);
    const client = new DixaClient("token", { adapter, retry: false });

    await expect(client.get("v1/agents")).rejects.toSatisfy(isDixaApiError);
    expect(requests).toHaveLength(1);
  });

  it("takes a bare retry count", async () => {
    const { adapter, requests } = createMockAdapter([
      { status: 503 },
      { status: 503 },
      { status: 503 },
      { status: 503 },
      { data: { data: [] } },
    ]);
    const client = new DixaClient("token", {
      adapter,
      retry: { retries: 4, sleep: async () => {} },
    });

    await client.get("v1/agents");
    expect(requests).toHaveLength(5);
  });

  it("is configurable through the Dixa entry point", async () => {
    const { adapter, requests } = createMockAdapter([
      { status: 429, headers: { "retry-after": "1" } },
      { data: { data: [{ id: "t-1" }] } },
    ]);
    const dixa = new Dixa("token", { adapter, retry: { sleep: async () => {} } });

    await expect(dixa.v1.tags.list()).resolves.toEqual([{ id: "t-1" }]);
    expect(requests).toHaveLength(2);
  });
});

describe("resolveRetryPolicy", () => {
  it("defaults to two retries", () => {
    expect(resolveRetryPolicy(undefined).retries).toBe(2);
  });

  it("treats false and 0 as disabled", () => {
    expect(resolveRetryPolicy(false).retries).toBe(0);
    expect(resolveRetryPolicy(0).retries).toBe(0);
  });

  it("accepts a bare count and clamps a negative one", () => {
    expect(resolveRetryPolicy(5).retries).toBe(5);
    expect(resolveRetryPolicy(-1).retries).toBe(0);
  });
});

describe("shouldRetry", () => {
  const policy = resolveRetryPolicy(undefined);
  const errorWith = (status?: number, code?: string) =>
    new DixaApiError("x", { status, code });

  it("retries 429 for any method", () => {
    expect(shouldRetry(errorWith(429), "POST", policy)).toBe(true);
  });

  it("retries 5xx and 408 for idempotent methods only", () => {
    expect(shouldRetry(errorWith(500), "GET", policy)).toBe(true);
    expect(shouldRetry(errorWith(408), "DELETE", policy)).toBe(true);
    expect(shouldRetry(errorWith(500), "POST", policy)).toBe(false);
  });

  it("never retries 4xx other than 408/429", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(errorWith(status), "GET", policy)).toBe(false);
    }
  });

  it("never retries a cancelled request", () => {
    expect(shouldRetry(errorWith(undefined, "ERR_CANCELED"), "GET", policy)).toBe(false);
  });
});

describe("computeRetryDelay", () => {
  const policy = resolveRetryPolicy({ minDelayMs: 1000, maxDelayMs: 8000 });

  it("prefers Retry-After over computed back-off", () => {
    const error = new DixaApiError("x", { status: 429, retryAfterMs: 3000 });
    expect(computeRetryDelay(error, 1, policy)).toEqual({
      delayMs: 3000,
      fromRetryAfter: true,
      exceedsMaxRetryAfter: false,
    });
  });

  it("doubles the window per attempt, capped at maxDelayMs", () => {
    const error = new DixaApiError("x", { status: 503 });
    // random() pinned to 1 so the delay is the top of the jitter window
    expect(computeRetryDelay(error, 1, policy, () => 1).delayMs).toBe(1000);
    expect(computeRetryDelay(error, 2, policy, () => 1).delayMs).toBe(2000);
    expect(computeRetryDelay(error, 3, policy, () => 1).delayMs).toBe(4000);
    expect(computeRetryDelay(error, 4, policy, () => 1).delayMs).toBe(8000);
    expect(computeRetryDelay(error, 9, policy, () => 1).delayMs).toBe(8000);
  });

  it("jitters the bottom half of the window", () => {
    const error = new DixaApiError("x", { status: 503 });
    expect(computeRetryDelay(error, 1, policy, () => 0).delayMs).toBe(500);
  });
});
