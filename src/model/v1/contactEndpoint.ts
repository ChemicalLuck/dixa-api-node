// Email endpoint
export interface EmailEndpoint {
  address: string;
  name?: string;
  senderOverride?: string;
  _type?: "EmailEndpoint"; // optional discriminator if provided by API
}

// Telephony endpoint
export interface TelephonyEndpoint {
  number: string;
  functionality?: string[];
  name?: string;
  _type?: "TelephonyEndpoint"; // optional discriminator
}

// Union type
export type ContactEndpoint = EmailEndpoint | TelephonyEndpoint;
