export interface WebhookSubscription {
  createdAt: string;
  createdBy: string;
  enabled: boolean;
  headers: Record<string, string>;
  id: string;
  name: string;
  secretKey: string;
  subscribedEvents?: string[];
  updatedAt: string;
  updatedBy: string;
  url: string;
}

export interface DeliveryDetail {
  deliveryTimestamp: string;
  responseCode: number;
  responseText: string;
  success: boolean;
  _type: "DeliveryDetail";
}

export interface NoRecentDelivery {
  _type: "NoRecentDelivery";
}

export type DeliveryStatus = DeliveryDetail | NoRecentDelivery;

export interface EventDeliveryLog {
  deliveryDetail: DeliveryDetail;
  payload: string;
}

export type Event =
  | "ConversationPending"
  | "AgentUnbannedEnduser"
  | "ConversationMessageAdded"
  | "ConversationTagAdded"
  | "AgentBannedIp"
  | "ConversationAssigned"
  | "ConversationPendingExpired"
  | "ConversationTransferred"
  | "ConversationEnqueued"
  | "ConversationCreated"
  | "ConversationUnassigned"
  | "ConversationOpen"
  | "ConversationAbandoned"
  | "ConversationClosed"
  | "ConversationNoteAdded"
  | "AgentBannedEnduser"
  | "ConversationEndUserReplaced"
  | "AgentUnbannedIp"
  | "ConversationTagRemoved"
  | "ConversationRated";

export interface EventDeliveryStatus {
  deliveryStatus: DeliveryStatus;
  event: Event;
}

export interface BasicAuth {
  username: string;
  password: string;
  _type: "BasicAuth";
}

export interface NoAuth {
  _type: "NoAuth";
}

export interface TokenAuth {
  value: string;
  _type: "TokenAuth";
}

export type Authorization = BasicAuth | NoAuth | TokenAuth;
