export type AnonymizationRequestType = "Conversation" | "Message" | "User";

export interface AnonymizationRequest {
  _type: AnonymizationRequestType;
  id: string;
  initiatedAt: string;
  processedAt?: string;
  requestedBy: string;
  targetEntityId: string;
}
