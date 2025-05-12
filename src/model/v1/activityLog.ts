export type ActivityLogType =
  | "ConversationRatingScheduled"
  | "ConversationOfferAccepted"
  | "ConversationPending"
  | "ConversationRatingUnscheduled"
  | "ConversationOfferRejected"
  | "ConversationEndUserReplaced"
  | "NoteAdded"
  | "FollowupExpired"
  | "ConversationRated"
  | "TagAdded"
  | "ConversationOfferTimeout"
  | "MessageAddedByCustomer"
  | "ConversationCreatedByCustomer"
  | "ConversationCreatedByAgent"
  | "TransferFailed"
  | "TransferSuccessful"
  | "ConversationOffered"
  | "ConversationUnassigned"
  | "TagRemoved"
  | "TransferInitiated"
  | "ConversationClaimed"
  | "ConversationReopened"
  | "ConversationClosed"
  | "ConversationLanguageUpdated"
  | "FollowupAdded"
  | "ConversationAutoreplySent"
  | "ConversationReserved"
  | "ConversationAssigned"
  | "ConversationRatingOffered"
  | "ConversationRatingCancelled"
  | "MessageAddedByAgent"
  | "FollowupRemoved";

export interface ActivityLogUser {
  id: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
}

export interface ConversationAssignedAttribute {
  agentId: string;
  agentName?: string;
}

export interface ConversationAutoReplySentAttribute {
  templateName: string;
}

export interface ConversationClaimedAttribute {
  claimedFromLabel?: string;
  claimedFromType?: string;
}

export interface ConversationCreatedAttribute {
  subject?: string;
}

export interface ConversationEndUserReplacedAttribute {
  newUser: ActivityLogUser;
  oldUser: ActivityLogUser;
}

export interface ConversationLanguageUpdatedAttribute {
  language: string;
}

export interface ConversationOfferedAttribute {
  agentNames?: string[];
  queueLabel: string;
}

export interface ConversationRatedAttribute {
  agent: ActivityLogUser;
  message?: string;
  score?: number;
}

export interface ConversationRatingOfferedAttribute {
  agent: ActivityLogUser;
  user: ActivityLogUser;
}

export interface ConversationRatingScheduledAttribute {
  ratingScheduledTime: string;
}

export interface ConversationReservedAttribute {
  agent: ActivityLogUser;
  queueId: string;
  queueName: string;
  reservationType: string;
  validUntil: string;
}

export interface ConversationTransferredAttribute {
  destinationId: string;
  destinationType: string;
  transferType: string;
  destinationLabel?: string;
  reason?: string;
}

export interface ConversationUnassignedAttribute {
  agent?: ActivityLogUser;
}

export interface MessageAddedAttribute {
  messageId: string;
  avatarUrl?: string;
  fromEndpoint?: string;
}

export interface NoteAddedAttribute {
  messageId: string;
  avatarUrl?: string;
}

export interface TagAddedAttribute {
  tag: string;
}

export interface TagRemovedAttribute {
  tag: string;
}

export type ActivityLogAttributes =
  | ConversationAssignedAttribute
  | ConversationAutoReplySentAttribute
  | ConversationClaimedAttribute
  | ConversationCreatedAttribute
  | ConversationEndUserReplacedAttribute
  | ConversationLanguageUpdatedAttribute
  | ConversationOfferedAttribute
  | ConversationRatedAttribute
  | ConversationRatingOfferedAttribute
  | ConversationRatingScheduledAttribute
  | ConversationReservedAttribute
  | ConversationTransferredAttribute
  | ConversationUnassignedAttribute
  | MessageAddedAttribute
  | NoteAddedAttribute
  | TagAddedAttribute
  | TagRemovedAttribute;

export interface ActivityLog {
  conversationId: string;
  _type?: ActivityLogType;
  activityTimestamp?: string;
  attributes?: ActivityLogAttributes;
  author?: ActivityLogUser;
  id?: string;
}
