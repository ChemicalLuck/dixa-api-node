import { describe, expect, it } from "vitest";
import { DixaClient } from "../src/client";
import { DixaApiError, isDixaApiError, parseRetryAfter } from "../src/errors";
import { createMockAdapter, MockReply } from "./helpers/mockAdapter";

// Retry is off here so each test sees exactly one request; retry has its own suite.
function clientFor(replies: MockReply | MockReply[]) {
  const { adapter, requests } = createMockAdapter(replies);
  return { client: new DixaClient("token", { adapter, retry: false }), requests };
}

async function captureError(promise: Promise<unknown>): Promise<DixaApiError> {
  try {
    await promise;
  } catch (error) {
    if (!isDixaApiError(error)) throw error;
    return error;
  }
  throw new Error("expected the request to reject");
}

describe("DixaApiError", () => {
  it("carries status, statusText, method, url and the Dixa error body", async () => {
    const { client } = clientFor({
      status: 404,
      data: { message: "Conversation not found" },
    });

    const error = await captureError(client.get("v1/conversations/123"));

    expect(error).toBeInstanceOf(DixaApiError);
    expect(error.name).toBe("DixaApiError");
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.method).toBe("GET");
    expect(error.url).toBe("v1/conversations/123");
    expect(error.body).toEqual({ message: "Conversation not found" });
    expect(error.apiMessage).toBe("Conversation not found");
  });

  it("builds a message naming the method, url, status and body", async () => {
    const { client } = clientFor({
      status: 404,
      data: { message: "Conversation not found" },
    });

    const error = await captureError(client.get("v1/conversations/123"));

    expect(error.message).toBe(
      'Dixa GET v1/conversations/123 failed: 404 Not Found — {"message":"Conversation not found"}',
    );
  });

  it("classifies 401 as an auth error and not retryable", async () => {
    const { client } = clientFor({ status: 401, data: { message: "Bad token" } });

    const error = await captureError(client.get("v1/agents"));

    expect(error.isAuthError).toBe(true);
    expect(error.isRetryable).toBe(false);
    expect(error.isRateLimited).toBe(false);
    expect(error.isServerError).toBe(false);
  });

  it("classifies 404 as not found and not retryable", async () => {
    const { client } = clientFor({ status: 404 });

    const error = await captureError(client.get("v1/conversations/123"));

    expect(error.isNotFound).toBe(true);
    expect(error.isRetryable).toBe(false);
  });

  it("classifies 429 as rate limited and exposes Retry-After in ms", async () => {
    const { client } = clientFor({
      status: 429,
      headers: { "retry-after": "3" },
    });

    const error = await captureError(client.get("v1/agents"));

    expect(error.isRateLimited).toBe(true);
    expect(error.isRetryable).toBe(true);
    expect(error.retryAfterMs).toBe(3000);
  });

  it("classifies 5xx as a server error and retryable", async () => {
    const { client } = clientFor({ status: 503 });

    const error = await captureError(client.get("v1/agents"));

    expect(error.isServerError).toBe(true);
    expect(error.isRetryable).toBe(true);
  });

  it("classifies a transport failure with no response", async () => {
    const { client } = clientFor({
      error: { message: "timeout of 30000ms exceeded", code: "ECONNABORTED" },
    });

    const error = await captureError(client.get("v1/agents"));

    expect(error.status).toBeUndefined();
    expect(error.isNetworkError).toBe(true);
    expect(error.isTimeout).toBe(true);
    expect(error.isRetryable).toBe(true);
    expect(error.code).toBe("ECONNABORTED");
    expect(error.message).toBe(
      "Dixa GET v1/agents failed: timeout of 30000ms exceeded (ECONNABORTED)",
    );
  });

  it("keeps originalError for back-compat", async () => {
    const { client } = clientFor({ status: 500, data: "boom" });

    const error = await captureError(client.get("v1/agents"));

    expect((error.originalError as { response?: { status?: number } }).response?.status).toBe(500);
  });

  it("reports the method and url of writes too", async () => {
    const { client } = clientFor({ status: 409, data: { message: "Already tagged" } });

    const error = await captureError(client.put("v1/conversations/1/tags/2"));

    expect(error.method).toBe("PUT");
    expect(error.message).toContain("Dixa PUT v1/conversations/1/tags/2 failed: 409 Conflict");
  });

  it("truncates a very long error body in the message", async () => {
    const { client } = clientFor({ status: 400, data: { message: "x".repeat(2000) } });

    const error = await captureError(client.get("v1/agents"));

    expect(error.message.length).toBeLessThan(700);
    expect(error.message.endsWith("…")).toBe(true);
    // the full body is still available on the error
    expect((error.body as { message: string }).message).toHaveLength(2000);
  });
});

describe("isDixaApiError", () => {
  it("matches a DixaApiError", () => {
    expect(isDixaApiError(new DixaApiError("nope"))).toBe(true);
  });

  it("does not match other errors or non-errors", () => {
    expect(isDixaApiError(new Error("nope"))).toBe(false);
    expect(isDixaApiError(undefined)).toBe(false);
    expect(isDixaApiError(null)).toBe(false);
    expect(isDixaApiError({ status: 500 })).toBe(false);
  });

  it("matches an error thrown by a duplicate copy of the class", () => {
    // Mirrors having both the ESM and CJS build loaded: a structurally identical
    // error from a different class instance must still be recognised.
    const brand = Symbol.for("@chemicalluck/dixa-api-node.DixaApiError");
    const foreign = Object.assign(new Error("from another copy"), {
      [brand]: true,
    });
    expect(isDixaApiError(foreign)).toBe(true);
  });
});

describe("parseRetryAfter", () => {
  it("reads delta-seconds", () => {
    expect(parseRetryAfter({ "retry-after": "12" })).toBe(12000);
    expect(parseRetryAfter({ "retry-after": "0" })).toBe(0);
  });

  it("reads an HTTP-date relative to now", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(
      parseRetryAfter({ "retry-after": "Thu, 01 Jan 2026 00:00:05 GMT" }, now),
    ).toBe(5000);
  });

  it("never returns a negative delay for a date in the past", () => {
    const now = Date.parse("2026-01-01T00:00:10Z");
    expect(
      parseRetryAfter({ "retry-after": "Thu, 01 Jan 2026 00:00:00 GMT" }, now),
    ).toBe(0);
  });

  it("returns undefined when absent or unparseable", () => {
    expect(parseRetryAfter({})).toBeUndefined();
    expect(parseRetryAfter({ "retry-after": "soonish" })).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });
});
