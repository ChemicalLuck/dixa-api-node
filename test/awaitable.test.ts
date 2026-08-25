import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Dixa } from "../src/index";
import { isDixaApiError } from "../src/errors";
import { createMockAdapter, MockReply } from "./helpers/mockAdapter";

function dixaFor(replies: MockReply | MockReply[]) {
  const { adapter, requests } = createMockAdapter(replies);
  return { dixa: new Dixa("token", { adapter, retry: false }), requests };
}

const RESOURCE_DIR = path.join(import.meta.dirname, "..", "src", "api", "v1");

describe("methods that must be awaitable", () => {
  it("webhooks.delete issues the request and resolves", async () => {
    const { dixa, requests } = dixaFor({ status: 204, data: "" });

    await expect(dixa.v1.webhooks.delete("w-1")).resolves.toBeUndefined();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toBe("v1/webhooks/w-1");
  });

  it("webhooks.delete rejects so a failed unsubscribe is catchable", async () => {
    const { dixa } = dixaFor({ status: 404, data: { message: "No such webhook" } });

    await expect(dixa.v1.webhooks.delete("w-1")).rejects.toSatisfy(
      (error: unknown) => isDixaApiError(error) && error.status === 404,
    );
  });

  it("teams.delete issues the request and resolves", async () => {
    const { dixa, requests } = dixaFor({ status: 204, data: "" });

    await expect(dixa.v1.teams.delete("t-1")).resolves.toBeUndefined();
    expect(requests[0]?.url).toBe("v1/teams/t-1");
  });

  it("teams.delete rejects on failure", async () => {
    const { dixa } = dixaFor({ status: 500 });

    await expect(dixa.v1.teams.delete("t-1")).rejects.toSatisfy(isDixaApiError);
  });

  it("teams.removeMembers issues the request and resolves", async () => {
    const { dixa, requests } = dixaFor({ status: 204, data: "" });

    await expect(
      dixa.v1.teams.removeMembers("t-1", { agentIds: ["a-1"] }),
    ).resolves.toBeUndefined();
    expect(requests[0]?.url).toBe("v1/teams/t-1/agents");
  });

  it("teams.removeMembers rejects on failure", async () => {
    const { dixa } = dixaFor({ status: 403 });

    await expect(
      dixa.v1.teams.removeMembers("t-1", { agentIds: ["a-1"] }),
    ).rejects.toSatisfy(isDixaApiError);
  });

  it("conversations.untag issues the request and resolves", async () => {
    const { dixa, requests } = dixaFor({ status: 204, data: "" });

    await expect(dixa.v1.conversations.untag("c-1", "tag-1")).resolves.toBeUndefined();
    expect(requests[0]?.url).toBe("v1/conversations/c-1/tags/tag-1");
  });

  it("conversations.untag rejects on failure", async () => {
    const { dixa } = dixaFor({ status: 404 });

    await expect(dixa.v1.conversations.untag("c-1", "tag-1")).rejects.toSatisfy(
      isDixaApiError,
    );
  });
});

describe("no resource method drops its request", () => {
  // A call made as a bare statement resolves before the request settles: the
  // caller cannot await it, and the rejection escapes as an unhandled promise
  // rejection. This guards every resource, not just the four that were broken.
  it("never calls the client without returning or awaiting it", () => {
    const offenders: string[] = [];

    for (const file of readdirSync(RESOURCE_DIR).filter((f) => f.endsWith(".ts"))) {
      const contents = readFileSync(path.join(RESOURCE_DIR, file), "utf8");
      contents.split("\n").forEach((line, index) => {
        if (/^\s+this\.(_(get|post|put|patch|delete|paginate)|client\.)/.test(line)) {
          offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
