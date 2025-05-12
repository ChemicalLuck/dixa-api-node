import DixaResource, { DixaVersion } from "../resource";
import {
  Queue1,
  QueueMember,
  OfferingAlgorithm,
  QueueThreshold,
  AssignAgentOutcome,
} from "../../model/v1/queue";
import { Channel } from "../../model/v1/conversation";
import DixaClient from "../../client";

export interface QueueAssignBody {
  agentIds: string[];
}

export interface QueueRemoveBody {
  agentIds: string[];
}

export interface QueueCreateRequest {
  isDefault: boolean;
  isDoNotOfferEnabled: boolean;
  name: string;
  callFunctionality?: boolean;
  doNotOfferTimeouts?: Record<Channel, number>;
  isPreferredAgentEnabled?: boolean;
  offerAbandonedConversations?: boolean;
  offerAlgorithm?: OfferingAlgorithm;
  offerTimeout?: number;
  personalAgentOfflineTimeout?: number;
  preferredAgentOfflineTimeout?: number;
  preferredAgentTimeouts?: Record<Channel, number>;
  priority?: number;
  queueThresholds?: Record<QueueThreshold, number>;
  wrapupTimeout?: number;
}

export interface QueueCreateBody {
  request?: QueueCreateRequest;
}

export class QueuesResource extends DixaResource {
  protected resource = "queues";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async assign(
    queueId: string,
    body: QueueAssignBody,
  ): Promise<AssignAgentOutcome[]> {
    return this._patch(this.buildUrl(`/${queueId}/members`), body);
  }

  async create(body: QueueCreateBody): Promise<Queue1> {
    return this._post(this.buildUrl(), body);
  }

  async get(queueId: string): Promise<Queue1> {
    const data = await this._get<Queue1>(this.buildUrl(`/${queueId}`));
    return data;
  }

  async listAgents(queueId: string): Promise<QueueMember[]> {
    return this._paginate<QueueMember>(this.buildUrl(`/${queueId}/members`));
  }

  async list(): Promise<Queue1[]> {
    return this._paginate<Queue1>(this.buildUrl());
  }

  // TODO: delete cannot handle payload
  async remove(queueId: string, body: QueueRemoveBody): Promise<string> {
    return this.client.delete(this.buildUrl(`/${queueId}/members`));
  }
}
