import DixaResource, { DixaVersion } from "../resource";
import { EndUser, EndUserCustomAttribute } from "../../model/v1/endUser";
import { AnonymizationRequest } from "../../model/v1/anonymization";
import { Conversation } from "../../model/v1/conversation";
import { BulkActionOutcome } from "../../model/v1/bulkAction";
import DixaClient from "../../client";

export interface EndUserCreateBody {
  additionalEmails?: string[];
  additionalPhoneNumbers?: string[];
  avatarUrl?: string;
  displayName?: string;
  email?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  middleNames?: string[];
  phoneNumber?: string;
}

export interface EndUserPatchBody extends EndUserCreateBody {}

export interface EndUserPatchBulkBody extends EndUserCreateBody {
  id: string;
}

export interface EndUserUpdateBody extends EndUserCreateBody {}

export interface EndUserUpdateBulkBody extends EndUserCreateBody {
  id: string;
}

export interface EndUserListQuery {
  email?: string;
  externalId?: string;
  phone?: string;
}

export type EndUserPatchCustomAttributesBody = Record<
  string,
  string | string[]
>;

export class EndUsersResource extends DixaResource {
  protected resource = "endusers";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async anonymize(endUserId: string): Promise<AnonymizationRequest> {
    return this.client.patch(this.buildUrl(`/${endUserId}/anonymize`));
  }

  async create(body: EndUserCreateBody): Promise<EndUser> {
    return this._post(this.buildUrl(), body);
  }

  async createBulk(
    body: EndUserCreateBody[],
  ): Promise<BulkActionOutcome<EndUser>[]> {
    return this._post(this.buildUrl("/bulk"), { data: body });
  }

  async get(endUserId: string): Promise<EndUser> {
    return this._get(this.buildUrl(`/${endUserId}`));
  }

  async list(query?: EndUserListQuery): Promise<EndUser[]> {
    return this._paginate(this.buildUrl(), query);
  }

  async listConversations(endUserId: string): Promise<Conversation[]> {
    return this._paginate(this.buildUrl(`/${endUserId}/conversations`));
  }

  async patch(endUserId: string, body: EndUserPatchBody): Promise<EndUser> {
    return this._patch(this.buildUrl(`/${endUserId}`), body);
  }

  async patchEndUserCustomAttributes(
    endUserId: string,
    body: EndUserPatchCustomAttributesBody,
  ): Promise<EndUserCustomAttribute[]> {
    return this._patch(this.buildUrl(`/${endUserId}/custom-attributes`), body);
  }

  async patchBulk(
    body: EndUserPatchBulkBody[],
  ): Promise<BulkActionOutcome<EndUser>[]> {
    return this._patch(this.buildUrl(), { data: body });
  }

  async update(endUserId: string, body: EndUserUpdateBody): Promise<EndUser> {
    return this._put(this.buildUrl(`/${endUserId}`), body);
  }

  async updateBulk(
    body: EndUserUpdateBulkBody[],
  ): Promise<BulkActionOutcome<EndUser>[]> {
    return this._put(this.buildUrl(), { data: body });
  }
}
