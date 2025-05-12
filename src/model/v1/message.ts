// Shared types
export interface Attachment {
  prettyName: string;
  url: string;
}

export interface File {
  prettyName: string;
  url: string;
}

export type Direction = "Inbound" | "Outbound";

export interface HtmlContent {
  value: string;
  _type: "Html";
}

export interface TextContent {
  value: string;
  _type: "Text";
}

export type Content = HtmlContent | TextContent;

export interface EmailContact {
  email: string;
  name: string;
}

export interface EmailContent {
  content: Content;
}

// Message Attribute Variants

export interface CallRecordingAttributes {
  duration?: number;
  recording: string;
  _type: "CallRecordingAttributes";
}

export interface ChatAttributes {
  _type: "ChatAttributes";
  isAutomated: boolean;
  attachments?: Attachment[];
  content?: Content;
  direction?: Direction;
}

export interface ContactFormAttributes {
  _type: "ContactFormAttributes";
  isAutoReply: boolean;
  attachments?: Attachment[];
  bcc?: EmailContact[];
  cc?: EmailContact[];
  deliveryFailureReason?: string;
  direction?: Direction;
  emailContent?: EmailContent;
  from_?: EmailContact;
  inlineImages?: File[];
  originalContentUrl?: File;
  replyDefaultToEmails?: EmailContact[];
  to?: EmailContact[];
}

export interface EmailAttributes {
  _type: "EmailAttributes";
  from_: EmailContact;
  isAutoReply: boolean;
  attachments?: Attachment[];
  bcc?: EmailContact[];
  cc?: EmailContact[];
  deliveryFailureReason?: string;
  direction?: Direction;
  emailContent?: EmailContent;
  inlineImages?: File[];
  originalContentUrl?: File;
  replyDefaultToEmails?: EmailContact[];
  to?: EmailContact[];
}

export interface FacebookMessengerAttributes {
  _type: "FacebookMessengerAttributes";
  attachments?: Attachment[];
  content?: Content;
  direction?: Direction;
}

export interface GenericAttributes {
  _type: "GenericAttributes";
  attachments?: Attachment[];
  content?: Content;
  direction?: Direction;
}

export interface PhoneAttributes {
  _type: "PhoneAttributes";
  from_: string;
  to: string;
  direction?: Direction;
  duration?: number;
}

export interface SmsAttributes {
  _type: "SmsAttributes";
  attachments?: Attachment[];
  content?: Content;
  direction?: Direction;
}

export interface TwitterAttributes {
  _type: "TwitterAttributes";
  attachments?: Attachment[];
  content?: Content;
  direction?: Direction;
}

export interface WhatsAppAttributes {
  _type: "WhatsAppAttributes";
  attachments?: Attachment[];
  content?: Content;
  direction?: Direction;
}

// Discriminated union of all attribute types
export type MessageAttributes =
  | CallRecordingAttributes
  | ChatAttributes
  | ContactFormAttributes
  | EmailAttributes
  | FacebookMessengerAttributes
  | GenericAttributes
  | PhoneAttributes
  | SmsAttributes
  | TwitterAttributes
  | WhatsAppAttributes;

// Message entity
export interface Message {
  id: string;
  authorId: string;
  externalId?: string;
  createdAt: string;
  attributes: MessageAttributes;
}
