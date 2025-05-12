import DixaResource, { DixaVersion } from "../resource";
import { TeamWithName, TeamMember } from "../../model/v1/team";
import { AgentPresence } from "../../model/v1/agent";
import DixaClient from "../../client";

export interface TeamAddMembersBody {
  agentIds: string[];
}

export interface TeamRemoveMembersBody {
  agentIds: string[];
}

export interface TeamCreateBody {
  name: string;
}

export class TeamsResource extends DixaResource {
  protected resource = "teams";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async addMembers(teamId: string, body: TeamAddMembersBody): Promise<void> {
    return this.client.post(this.buildUrl(`/${teamId}/agents`), body);
  }

  async create(body: TeamCreateBody): Promise<TeamWithName> {
    return this._post<TeamWithName>(this.buildUrl(), body);
  }

  async delete(teamId: string): Promise<void> {
    this._delete(this.buildUrl(`/${teamId}`));
  }

  async get(teamId: string): Promise<TeamWithName> {
    return this._get(this.buildUrl(`/${teamId}`));
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    return this._paginate(this.buildUrl(`/${teamId}/agents`));
  }

  async listPresence(teamId: string): Promise<AgentPresence[]> {
    return this._paginate(this.buildUrl(`/${teamId}/presence`));
  }

  async list(): Promise<TeamWithName[]> {
    return this._paginate(this.buildUrl());
  }

  /// TODO: delete does not handle body.
  async removeMembers(
    teamId: string,
    body: TeamRemoveMembersBody,
  ): Promise<void> {
    this._delete(this.buildUrl(`/${teamId}/agents`));
  }
}
