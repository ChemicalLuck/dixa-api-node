import { describe, expect, it } from "vitest";
import { Dixa } from "../src/index";
import { DixaClient } from "../src/client";
import { createMockAdapter, MockReply } from "./helpers/mockAdapter";

function clientFor(replies: MockReply | MockReply[]) {
  const { adapter, requests } = createMockAdapter(replies);
  return { client: new DixaClient("token", { adapter }), requests };
}

function dixaFor(replies: MockReply | MockReply[]) {
  const { adapter, requests } = createMockAdapter(replies);
  return { dixa: new Dixa("token", { adapter }), requests };
}

describe("envelope unwrapping", () => {
  it("unwraps data on GET", async () => {
    const { client } = clientFor({ data: { data: { id: "c-1", state: "Open" } } });

    await expect(client.get("v1/conversations/c-1")).resolves.toEqual({
      id: "c-1",
      state: "Open",
    });
  });

  it("unwraps data on POST, PUT and PATCH", async () => {
    const { client } = clientFor([
      { status: 201, data: { data: { id: "post" } } },
      { data: { data: { id: "put" } } },
      { data: { data: { id: "patch" } } },
    ]);

    await expect(client.post("v1/conversations", {})).resolves.toEqual({ id: "post" });
    await expect(client.put("v1/agents/1", {})).resolves.toEqual({ id: "put" });
    await expect(client.patch("v1/agents/1", {})).resolves.toEqual({ id: "patch" });
  });

  it("drops the meta sibling when unwrapping", async () => {
    const { client } = clientFor({
      data: { data: { id: "c-1" }, meta: { next: "/v1/whatever" } },
    });

    await expect(client.get("v1/conversations/c-1")).resolves.toEqual({ id: "c-1" });
  });

  it("unwraps an array payload", async () => {
    const { client } = clientFor({ data: { data: [{ id: "a" }, { id: "b" }] } });

    await expect(client.post("v1/agents/bulk", {})).resolves.toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });

  it("unwraps a null payload", async () => {
    const { client } = clientFor({ data: { data: null } });

    await expect(client.get("v1/agents/1")).resolves.toBeNull();
  });

  it("returns a non-enveloped body untouched", async () => {
    const { client } = clientFor({ data: { id: "c-1", state: "Open" } });

    await expect(client.get("v1/conversations/c-1")).resolves.toEqual({
      id: "c-1",
      state: "Open",
    });
  });

  it("leaves a resource that has its own data field alone", async () => {
    // Only { data } / { data, meta } is treated as an envelope, so a payload
    // that carries a sibling key is passed through whole.
    const body = { id: "x", data: { nested: true }, other: 1 };
    const { client } = clientFor({ data: body });

    await expect(client.get("v1/whatever")).resolves.toEqual(body);
  });

  it("returns undefined for a 204", async () => {
    const { client } = clientFor({ status: 204, data: "" });

    await expect(client.delete("v1/webhooks/w-1")).resolves.toBeUndefined();
  });

  it("returns undefined for a 200 with an empty body", async () => {
    const { client } = clientFor({ status: 200, data: "" });

    await expect(client.put("v1/conversations/1/close", {})).resolves.toBeUndefined();
  });

  it("returns a plain string body untouched", async () => {
    const { client } = clientFor({ data: "ok" });

    await expect(client.delete("v1/teams/t-1")).resolves.toBe("ok");
  });

  it("unwraps through the resource layer, so typed reads are true at runtime", async () => {
    const { dixa } = dixaFor({
      data: { data: { id: "c-1", state: "Open", subject: "Order query" } },
    });

    const conversation = await dixa.v1.conversations.get("c-1");

    // Before this fix these read undefined while typed as present.
    expect(conversation.id).toBe("c-1");
    expect(conversation.state).toBe("Open");
  });

  it("unwraps end user reads, the path the dispatch board depends on", async () => {
    const { dixa } = dixaFor({
      data: { data: { id: "u-1", email: "customer@example.com" } },
    });

    const endUser = await dixa.v1.endUsers.get("u-1");

    expect(endUser.email).toBe("customer@example.com");
  });

  it("still unwraps list reads through paginate", async () => {
    const { dixa } = dixaFor({ data: { data: [{ id: "t-1" }, { id: "t-2" }] } });

    const tags = await dixa.v1.tags.list();

    expect(tags.map((tag) => tag.id)).toEqual(["t-1", "t-2"]);
  });
});
