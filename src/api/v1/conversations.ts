import DixaResource, { DixaVersion } from "../resource";
import {
  BrowserInfo,
  Channel,
  Conversation,
  ConversationCustomAttribute,
  ConversationFlow,
  ConversationRating,
  ConversationSearchHit,
  Direction,
} from "../../model/v1/conversation"; // Assume model barrel file or split if not
import { Content, Message } from "../../model/v1/message";
import { ActivityLog } from "../../model/v1/activityLog";
import { InternalNote } from "../../model/v1/internalNote";
import { AnonymizationRequest } from "../../model/v1/anonymization";
import DixaClient from "../../client";
import { Tag } from "../../model/v1/tag";

// Typed request bodies
export interface ConversationAddInternalNoteBody {
  message: string;
  agentId?: string;
  createdAt?: string;
}

export interface ConversationAddMessageInboundBody {
  content: Content;
  attachments?: File[];
  externalId?: string;
  integrationEmail?: string;
  _type?: "Inbound";
}

export interface ConversationAddMessageOutboundBody {
  agentId: string;
  content: Content;
  attachments?: File[];
  bcc?: string[];
  cc?: string[];
  externalId?: string;
  integrationEmail?: string;
  _type?: "Outbound";
}

export type ConversationAddMessageBody =
  | ConversationAddMessageInboundBody
  | ConversationAddMessageOutboundBody;

export interface ConversationClaimBody {
  agentId: string;
  force?: boolean;
}

export interface ConversationCloseBody {
  userId?: string;
}

export type ConversationCreateBody =
  | {
      _type: "Callback";
      contactEndpointId: string;
      direction: Direction;
      queueId: string;
      requesterId: string;
    }
  | {
      _type: "Chat";
      browserInfo?: BrowserInfo;
      language?: string;
      message: ConversationAddMessageBody;
      requesterId: string;
      widgetId: string;
    }
  | {
      _type: "ContactForm";
      emailIntegrationId: string;
      language?: string;
      message: ConversationAddMessageBody;
      requesterId: string;
      subject: string;
    }
  | {
      _type: "Email";
      emailIntegrationId: string;
      language?: string;
      message: ConversationAddMessageBody;
      requesterId: string;
      subject: string;
    }
  | {
      _type: "Sms";
      contactEndpointId: string;
      message: ConversationAddMessageBody;
      requesterId: string;
    };

export interface ConversationTransferBody {
  queueId: string;
  userId?: string;
}

export interface ConversationReopenBody {
  userId: string;
}

export interface ConversationListFlowsQuery {
  channel: Channel;
}

export interface ConversationSearchQuery {
  exactMatch?: boolean;
  query: string;
}

export type ConversationPatchCustomAttributesBody = Record<
  string,
  string | string[]
>;

export class ConversationsResource extends DixaResource {
  protected resource = "conversations";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async addInternalNote(
    conversationId: string,
    body: ConversationAddInternalNoteBody,
  ): Promise<InternalNote> {
    return this._post(this.buildUrl(`/${conversationId}/notes`), body);
  }

  async addInternalNotes(
    conversationId: string,
    body: ConversationAddInternalNoteBody[],
  ): Promise<InternalNote[]> {
    return this._post(this.buildUrl(`/${conversationId}/notes/bulk`), {
      data: body,
    });
  }

  async addMessage(
    conversationId: string,
    body: ConversationAddMessageBody,
  ): Promise<Message> {
    return this._post(this.buildUrl(`/${conversationId}/messages`), body);
  }

  async anonymize(conversationId: string): Promise<AnonymizationRequest> {
    return this._patch(this.buildUrl(`/${conversationId}/anonymize`));
  }

  async anonymizeMessage(
    conversationId: string,
    messageId: string,
  ): Promise<AnonymizationRequest> {
    return this._patch(
      this.buildUrl(`/${conversationId}/messages/${messageId}/anonymize`),
    );
  }

  async claim(
    conversationId: string,
    body: ConversationClaimBody,
  ): Promise<void> {
    return this._put(this.buildUrl(`/${conversationId}/claim`), body);
  }

  async close(
    conversationId: string,
    body: ConversationCloseBody,
  ): Promise<void> {
    return this._put(this.buildUrl(`/${conversationId}/close`), body);
  }

  async create(body: ConversationCreateBody): Promise<Conversation> {
    return this._post(this.buildUrl(), body);
  }

  async get(conversationId: string): Promise<Conversation> {
    return this._get(this.buildUrl(`/${conversationId}`));
  }

  async listActivityLogs(conversationId: string): Promise<ActivityLog[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/activitylog`));
  }

  async listFlows(
    conversationId: string,
    query?: ConversationListFlowsQuery,
  ): Promise<ConversationFlow[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/flows`), query);
  }

  async listInternalNotes(conversationId: string): Promise<InternalNote[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/notes`));
  }

  async listLinkedConversations(
    conversationId: string,
  ): Promise<Conversation[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/linked`));
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/messages`));
  }

  async listOrganizationActivityLog(
    conversationId: string,
  ): Promise<ActivityLog[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/activitylog`));
  }

  async listRating(conversationId: string): Promise<ConversationRating[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/rating`));
  }

  async listTags(conversationId: string): Promise<Tag[]> {
    return this._paginate(this.buildUrl(`/${conversationId}/tags`));
  }

  async patchConversationCustomAttributes(
    conversationId: string,
    body: ConversationPatchCustomAttributesBody,
  ): Promise<ConversationCustomAttribute[]> {
    return this._patch(
      this.buildUrl(`/${conversationId}/custom-attributes`),
      body,
    );
  }

  async reopen(
    conversationId: string,
    body: ConversationReopenBody,
  ): Promise<void> {
    return this._put(this.buildUrl(`/${conversationId}/reopen`), body);
  }

  async search(
    query: ConversationSearchQuery,
  ): Promise<ConversationSearchHit[]> {
    return this._paginate(this.buildUrl("/search"), query);
  }

  async tag(conversationId: string, tagId: string): Promise<void> {
    return this._put(this.buildUrl(`/${conversationId}/tags/${tagId}`));
  }

  async untag(conversationId: string, tagId: string): Promise<void> {
    this._delete(this.buildUrl(`/${conversationId}/tags/${tagId}`));
  }

  async transfer(
    conversationId: string,
    body: ConversationTransferBody,
  ): Promise<void> {
    return this._post(this.buildUrl(`/${conversationId}/transfer/queue`), body);
  }
}
