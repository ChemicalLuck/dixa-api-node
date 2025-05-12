export interface EndUserCustomAttribute {
  id: string;
  identifier: string;
  name: string;
  value: string[];
}

export interface EndUser {
  createdAt: string;
  id: string;
  additionalEmails?: string[];
  additionalPhoneNumbers?: string[];
  avatarUrl?: string;
  customAttributes?: EndUserCustomAttribute[];
  displayName?: string;
  email?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  middleNames?: string[];
  phoneNumber?: string;
}
