import { BulkActionFailure } from "./bulkAction";
import { Channel } from "./conversation";

export interface Queue {
  id: string;
  queuedAt?: string;
}

export type MemberListType = "Default" | "SkillBased";

export type OfferingAlgorithm =
  | "AgentPriorityOneAtATimeRandom"
  | "AllAtOnce"
  | "AgentPriorityLongestIdle"
  | "AgentPriorityAllAtOnce"
  | "LongestIdle"
  | "OneAtATimeRandom";

export type QueueThreshold =
  | "SlaTimeLimit"
  | "AvailableAgents"
  | "LongestWait"
  | "SlaPercentage"
  | "WaitingConversations";

export type SLACalculationMethod = "AbandonedIgnored";

export interface QueueUsages {
  queueId: string;
  usages: Record<Channel, string[]>;
}

export interface Queue1 {
  id: string;
  doNotOfferTimeouts: Record<Channel, number>;
  isDefault: boolean;
  isDoNotOfferEnabled: boolean;
  name: string;
  organizationId: string;

  isPreferredAgentEnabled?: boolean;
  memberListType?: MemberListType;
  offerAbandonedConversations?: boolean;
  offeringAlgorithm?: OfferingAlgorithm;
  offerTimeout?: number;
  personalAgentOfflineTimeout?: number;
  preferredAgentOfflineTimeout?: number;
  preferredAgentTimeouts?: Record<Channel, number>;
  priority?: number;
  queueThresholds?: Record<QueueThreshold, number>;
  slaCalculationMethod?: SLACalculationMethod;
  usages?: QueueUsages;
  wrapupTimeout?: number;
}

export interface AssignAgentBulkActionSuccess {
  data: string;
  _type: "BulkActionSuccess";
}

export type AssignAgentOutcome =
  | BulkActionFailure
  | AssignAgentBulkActionSuccess;

export interface QueueMember {
  agentId: string;
  priority?: number;
}
