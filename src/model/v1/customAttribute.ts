export interface SelectOption {
  id: string;
  isDeactivated: boolean;
  label: string;
  nestedOptions?: SelectOption[]; // Recursive definition
  value: string;
}

export interface Select {
  id: string;
  isDeactivated: boolean;
  label: string;
  nestedOptions?: SelectOption[];
  value: string;
}

export interface Text1 {
  placeholder?: string;
}

export interface CustomAttributeInputDefinition {
  options: Select | Text1;
}

export type EntityType = "Contact" | "Conversation";

export interface CustomAttributeDefinition {
  createdAt: string;
  description: string;
  entityType: EntityType;
  id: string;
  identifier: string;
  inputDefinition: CustomAttributeInputDefinition;
  isArchived: boolean;
  isDeactivated: boolean;
  isRequired: boolean;
  label: string;
  updatedAt?: string;
}
