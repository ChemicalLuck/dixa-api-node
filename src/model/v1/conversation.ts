export type Channel =
  | "WhatsApp"
  | "Voicemail"
  | "WidgetChat"
  | "FacebookMessenger"
  | "Email"
  | "PstnPhone"
  | "Sms"
  | "Twitter"
  | "Chat"
  | "Messenger";

export type Direction = "Inbound" | "Outbound";
export type ConversationState =
  | "AwaitingPending"
  | "Pending"
  | "Closed"
  | "Open";
export type RatingStatus =
  | "Unscheduled"
  | "Offered"
  | "Rated"
  | "Scheduled"
  | "Cancelled";
export type RatingType = "CSAT" | "ThumbsUpOrDown";
export type ConversationType = "DirectMessage" | "Tweet";

export interface Queue {
  id: string;
  queuedAt?: string;
}

export interface Assignment {
  agentId: string;
  assignedAt: string;
}

export interface BrowserInfo {
  name: string;
  ipAddress?: string;
  originatingUrl?: string;
  version?: string;
}

export interface ConversationRating {
  conversationChannel: Channel;
  id: string;
  ratingStatus: RatingStatus;
  ratingType: RatingType;
  timestamps: Record<string, string>;
  userId: string;
  agentId?: string;
  language?: string;
  ratingCommend?: string;
  ratingScore?: number;
}

export interface ConversationFlow {
  channel: Channel;
  contactEndpointId: string;
  id: string;
  name: string;
}

export interface ConversationCustomAttribute {
  id: string;
  identifier: string;
  name: string;
  value: string | string[];
}

export interface EmailForward {
  _type: "EmailForward";
  parentId: string;
}
export interface FollowUp {
  _type: "FollowUp";
  parentId: string;
}
export interface SideConversation {
  _type: "SideConversation";
  parentId: string;
}
export type ConversationLink = EmailForward | FollowUp | SideConversation;

export interface AnonymizedConversation {
  _type: "AnonymizedConversation";
  anonymizedAt: string;
  channel: Channel;
  createdAt: string;
  id: string;
  requesterId: string;
  customAttributes?: ConversationCustomAttribute[];
  link?: ConversationLink;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface ChatConversation {
  _type: "ChatConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  browserInfo?: BrowserInfo;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  language?: string;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface ContactFormConversation {
  _type: "ContactFormConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  fromEmail: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  integrationEmail?: string;
  language?: string;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
  subject?: string;
  toEmail?: string;
}

export interface EmailConversation {
  _type: "EmailConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  fromEmail: string;
  toEmail: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  integrationEmail?: string;
  language?: string;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
  subject?: string;
}

export interface FacebookMessengerConversation {
  _type: "FacebookMessengerConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface GenericConversation {
  _type: "GenericConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  fromContactPointId?: string;
  toContactPointId?: string;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface MessengerConversation {
  _type: "MessengerConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  language?: string;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface PstnPhoneConversation {
  _type: "PstnPhoneConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface SmsConversation {
  _type: "SmsConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  fromNumber?: string;
  toNumber?: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface TwitterConversation {
  _type: "TwitterConversation";
  id: string;
  channel: Channel;
  conversationType: ConversationType;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  contactPointTwitterId?: string;
  endUserTwitterId?: string;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export interface WhatsAppConversation {
  _type: "WhatsAppConversation";
  id: string;
  channel: Channel;
  createdAt: string;
  requesterId: string;
  assignment?: Assignment;
  customAttributes?: ConversationCustomAttribute[];
  direction?: Direction;
  link?: ConversationLink;
  queue?: Queue;
  state?: ConversationState;
  stateUpdatedAt?: string;
}

export type Conversation =
  | AnonymizedConversation
  | ChatConversation
  | ContactFormConversation
  | EmailConversation
  | FacebookMessengerConversation
  | GenericConversation
  | MessengerConversation
  | PstnPhoneConversation
  | SmsConversation
  | TwitterConversation
  | WhatsAppConversation;

export interface ConversationSearchInnerHit {
  id: string;
  highlights?: Record<string, string[]>;
}

export interface ConversationSearchHit {
  id: string;
  highlights?: Record<string, string[]>;
  innerHits?: ConversationSearchInnerHit[];
}
