import { describe, expect, it, vi } from "vitest";
import { DixaClient, DEFAULT_TIMEOUT_MS } from "../src/client";
import { isDixaApiError } from "../src/errors";
import { createMockAdapter, MockReply } from "./helpers/mockAdapter";

function clientFor(replies: MockReply[]) {
  const { adapter, requests } = createMockAdapter(replies);
  return { client: new DixaClient("token", { adapter, retry: false }), requests };
}

describe("paginate", () => {
  it("follows meta.next and concatenates the pages", async () => {
    const { client, requests } = clientFor([
      { data: { data: [{ id: "a" }], meta: { next: "/v1/agents?pageKey=k2" } } },
      { data: { data: [{ id: "b" }], meta: { next: "/v1/agents?pageKey=k3" } } },
      { data: { data: [{ id: "c" }] } },
    ]);

    await expect(client.paginate("v1/agents")).resolves.toEqual([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ]);
    expect(requests.map((r) => r.url)).toEqual([
      "v1/agents",
      "/v1/agents?pageKey=k2",
      "/v1/agents?pageKey=k3",
    ]);
  });

  it("sends the query on the first request only, so it cannot fight the cursor", async () => {
    // meta.next already encodes the query it was produced from inside pageKey.
    const { client, requests } = clientFor([
      {
        data: {
          data: [{ id: "a" }],
          meta: { next: "/v1/endusers?pageKey=abc&email=x%40example.com" },
        },
      },
      { data: { data: [{ id: "b" }] } },
    ]);

    await client.paginate("v1/endusers", { email: "x@example.com" });

    expect(requests[0]?.params).toEqual({ email: "x@example.com" });
    expect(requests[1]?.params).toBeUndefined();
  });

  it("resolves a root-relative next against the base URL", async () => {
    const { client, requests } = clientFor([
      { data: { data: [], meta: { next: "/v1/search/conversations/?pageKey=k2" } } },
      { data: { data: [] } },
    ]);

    await client.paginate("v1/search/conversations");

    expect(requests[1]?.fullUrl).toBe(
      "https://dev.dixa.io/v1/search/conversations/?pageKey=k2",
    );
  });

  it("follows an absolute next URL as given", async () => {
    const { client, requests } = clientFor([
      {
        data: {
          data: [],
          meta: { next: "https://dev.dixa.io/v1/agents?pageKey=k2" },
        },
      },
      { data: { data: [] } },
    ]);

    await client.paginate("v1/agents");

    expect(requests[1]?.fullUrl).toBe("https://dev.dixa.io/v1/agents?pageKey=k2");
  });

  it("stops instead of looping when a cursor repeats", async () => {
    const { client, requests } = clientFor([
      { data: { data: [{ id: "a" }], meta: { next: "v1/agents" } } },
    ]);

    await expect(client.paginate("v1/agents")).resolves.toEqual([{ id: "a" }]);
    expect(requests).toHaveLength(1);
  });

  it("returns an empty list for an empty body", async () => {
    const { client } = clientFor([{ status: 204, data: "" }]);

    await expect(client.paginate("v1/agents")).resolves.toEqual([]);
  });

  it("raises a clear error when data is not an array", async () => {
    const { client } = clientFor([{ data: { data: { id: "not-a-list" } } }]);

    const error = await client.paginate("v1/agents").catch((e: unknown) => e);

    expect(isDixaApiError(error)).toBe(true);
    expect((error as Error).message).toBe(
      'Dixa GET v1/agents did not return a list: expected "data" to be an array, got object',
    );
  });

  it("surfaces a request failure as a DixaApiError with the status", async () => {
    const { client } = clientFor([{ status: 403, data: { message: "No scope" } }]);

    const error = await client.paginate("v1/agents").catch((e: unknown) => e);

    expect(isDixaApiError(error)).toBe(true);
    expect((error as { status?: number }).status).toBe(403);
  });
});

describe("timeout", () => {
  it("applies a default timeout so a hung request cannot hang the caller", async () => {
    const { client, requests } = clientFor([{ data: { data: [] } }]);

    await client.get("v1/agents");

    expect(requests[0]?.timeout).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("honours an explicit timeout, including 0 for no timeout", async () => {
    const custom = createMockAdapter([{ data: { data: [] } }]);
    await new DixaClient("token", { adapter: custom.adapter, timeout: 1500 }).get("v1/agents");
    expect(custom.requests[0]?.timeout).toBe(1500);

    const none = createMockAdapter([{ data: { data: [] } }]);
    await new DixaClient("token", { adapter: none.adapter, timeout: 0 }).get("v1/agents");
    expect(none.requests[0]?.timeout).toBe(0);
  });
});

describe("host console", () => {
  it("never writes to the console", async () => {
    const spies = (["error", "warn", "log", "info", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );
    try {
      const { client } = clientFor([{ status: 500, data: { message: "boom" } }]);
      await client.get("v1/agents").catch(() => {});

      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it("reports failures through the logger option when one is given", async () => {
    const warn = vi.fn();
    const { adapter } = createMockAdapter([{ status: 500 }]);
    const client = new DixaClient("token", {
      adapter,
      retry: false,
      logger: { warn },
    });

    await client.get("v1/agents").catch(() => {});

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("Dixa GET v1/agents failed: 500");
  });
});
