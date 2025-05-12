import DixaResource, { DixaVersion } from "../resource";
import {
  Authorization,
  Event,
  EventDeliveryLog,
  EventDeliveryStatus,
  WebhookSubscription,
} from "../../model/v1/webhookSubscription";
import DixaClient from "../../client";

export interface WebhookCreateBody {
  name: string;
  url: string;
  authorization?: Authorization;
  enabled?: boolean;
  events?: Event[];
}

export interface WebhookPatchBody {
  authorization?: Authorization;
  enabled?: boolean;
  events?: Event[];
  name?: string;
  url?: string;
}

export class WebhooksResource extends DixaResource {
  protected resource = "webhooks";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async create(body: WebhookCreateBody): Promise<WebhookSubscription> {
    return this._post(this.buildUrl(), body);
  }

  async delete(webhookId: string): Promise<void> {
    this.client.delete(this.buildUrl(`/${webhookId}`));
  }

  async list(): Promise<WebhookSubscription[]> {
    return this._paginate(this.buildUrl());
  }

  async patch(
    webhookId: string,
    body: WebhookPatchBody,
  ): Promise<WebhookSubscription> {
    return this._patch(this.buildUrl(`/${webhookId}`), body);
  }

  async get(webhookId: string): Promise<WebhookSubscription> {
    return this._get(this.buildUrl(`/${webhookId}`));
  }

  async listEventLogs(
    webhookId: string,
    event: Event,
  ): Promise<EventDeliveryLog[]> {
    return this._paginate(
      this.buildUrl(`/${webhookId}/delivery-status/logs/${event}`),
    );
  }

  async listDeliveryStatuses(
    webhookId: string,
  ): Promise<EventDeliveryStatus[]> {
    return this._paginate(this.buildUrl(`/${webhookId}/delivery-status`));
  }
}
