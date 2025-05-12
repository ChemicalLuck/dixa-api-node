export type ConnectionStatus = "Online" | "Offline";
export type PresenceStatus = "Away" | "Working";

export interface Agent {
  createdAt: string;
  displayName: string;
  email: string;
  id: string;

  additionalEmails?: string[];
  additionalPhoneNumbers?: string[];
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  middleNames?: string[];
  phoneNumber?: string;
  roles?: string[];
}

export interface AgentPresence {
  connectionStatus: ConnectionStatus;
  requestTime: string;
  userId: string;

  activeChannels?: string[];
  lastSeen?: string;
  presenceStatus?: PresenceStatus;
}
