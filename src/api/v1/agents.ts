import DixaClient from "../../client";
import { Agent, AgentPresence } from "../../model/v1/agent";
import { BulkActionOutcome } from "../../model/v1/bulkAction";
import { Team } from "../../model/v1/team";
import DixaResource, { DixaVersion } from "../resource";

export interface AgentCreateBody {
  displayName: string;
  email: string;
  additionalEmails?: string[];
  additionalPhoneNumbers?: string[];
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  middleNames?: string[];
  phoneNumber?: string;
}

export interface AgentUpdateBody extends Omit<AgentCreateBody, "email"> {}

export interface AgentPatchBody extends Partial<AgentCreateBody> {}

export interface AgentUpdateBulkBody extends AgentUpdateBody {
  id: string;
}

export interface AgentPatchBulkBody extends Partial<AgentUpdateBulkBody> {}

export interface AgentListQuery {
  email?: string;
  phone?: string;
}

export class AgentResource extends DixaResource {
  protected resource = "agents";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async create(body: AgentCreateBody): Promise<Agent> {
    return this._post(this.buildUrl(), body);
  }

  async createBulk(
    body: AgentCreateBody[],
  ): Promise<BulkActionOutcome<Agent>[]> {
    return this._post(this.buildUrl("/bulk"), {
      data: body,
    });
  }

  async get(agentId: string): Promise<Agent> {
    return this._get(this.buildUrl(`/${agentId}`));
  }

  async update(agentId: string, body: AgentUpdateBody): Promise<Agent> {
    return this._put(this.buildUrl(`/${agentId}`), body);
  }

  async updateBulk(
    body: AgentUpdateBulkBody[],
  ): Promise<BulkActionOutcome<Agent>[]> {
    return this._put(this.buildUrl(), {
      data: body,
    });
  }

  async delete(agentId: string): Promise<string> {
    return this._delete(this.buildUrl(`/${agentId}`));
  }

  async list(query?: AgentListQuery): Promise<Agent[]> {
    return this._paginate(this.buildUrl(), query);
  }

  async getPresence(agentId: string): Promise<AgentPresence> {
    return this._get(this.buildUrl(`/${agentId}/presence`));
  }

  async listPresence(): Promise<AgentPresence[]> {
    return this._paginate(this.buildUrl("/presence"));
  }

  async listTeams(agentId: string): Promise<Team[]> {
    return this._paginate(this.buildUrl(`/${agentId}/teams`));
  }

  async patch(agentId: string, body: AgentPatchBody): Promise<Agent> {
    return this._patch(this.buildUrl(`/${agentId}`), body);
  }

  async patchBulk(
    body: AgentPatchBulkBody[],
  ): Promise<BulkActionOutcome<Agent>[]> {
    return this._patch(this.buildUrl(), {
      data: body,
    });
  }
}
