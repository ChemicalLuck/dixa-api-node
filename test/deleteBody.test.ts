import { describe, expect, it } from "vitest";
import { Dixa } from "../src/index";
import { DixaClient } from "../src/client";
import { createMockAdapter, MockReply } from "./helpers/mockAdapter";

function dixaFor(replies: MockReply | MockReply[]) {
  const { adapter, requests } = createMockAdapter(replies);
  return { dixa: new Dixa("token", { adapter, retry: false }), requests };
}

describe("DELETE request bodies", () => {
  it("sends the body for queues.remove", async () => {
    const { dixa, requests } = dixaFor({ status: 204, data: "" });

    await dixa.v1.queues.remove("q-1", { agentIds: ["a-1", "a-2"] });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toBe("v1/queues/q-1/members");
    expect(requests[0]?.body).toEqual({ agentIds: ["a-1", "a-2"] });
  });

  it("sends the body for teams.removeMembers", async () => {
    const { dixa, requests } = dixaFor({ status: 204, data: "" });

    await dixa.v1.teams.removeMembers("t-1", { agentIds: ["a-1"] });

    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toBe("v1/teams/t-1/agents");
    expect(requests[0]?.body).toEqual({ agentIds: ["a-1"] });
  });

  it("sends no body when none is given", async () => {
    const { adapter, requests } = createMockAdapter({ status: 204, data: "" });
    const client = new DixaClient("token", { adapter, retry: false });

    await client.delete("v1/webhooks/w-1");

    expect(requests[0]?.body).toBeUndefined();
  });

  it("accepts a body on the low-level client", async () => {
    const { adapter, requests } = createMockAdapter({ data: { data: { ok: true } } });
    const client = new DixaClient("token", { adapter, retry: false });

    await expect(
      client.delete<{ ok: boolean }>("v1/queues/q-1/members", { agentIds: ["a-1"] }),
    ).resolves.toEqual({ ok: true });
    expect(requests[0]?.body).toEqual({ agentIds: ["a-1"] });
  });
});
