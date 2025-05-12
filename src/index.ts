import { DixaClient } from "./client";
import * as v1 from "./api/v1";

class DixaV1 {
  agents: v1.AgentsResource;
  analytics: v1.AnalyticsResource;
  contactEndpoints: v1.ContactEndpointsResource;
  conversations: v1.ConversationsResource;
  customAttributes: v1.CustomAttributesResource;
  endUsers: v1.EndUsersResource;
  queues: v1.QueuesResource;
  tags: v1.TagsResource;
  teams: v1.TeamsResource;
  webhooks: v1.WebhooksResource;

  constructor(client: DixaClient) {
    this.agents = new v1.AgentsResource(client);
    this.analytics = new v1.AnalyticsResource(client);
    this.contactEndpoints = new v1.ContactEndpointsResource(client);
    this.conversations = new v1.ConversationsResource(client);
    this.customAttributes = new v1.CustomAttributesResource(client);
    this.endUsers = new v1.EndUsersResource(client);
    this.queues = new v1.QueuesResource(client);
    this.tags = new v1.TagsResource(client);
    this.teams = new v1.TeamsResource(client);
    this.webhooks = new v1.WebhooksResource(client);
  }
}

class Dixa {
  private client: DixaClient;
  v1: DixaV1;

  constructor(accessToken: string) {
    this.client = new DixaClient(accessToken);
    this.v1 = new DixaV1(this.client);
  }
}

export { Dixa };
