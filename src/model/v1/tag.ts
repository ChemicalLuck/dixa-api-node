export type TagState = "Active" | "Inactive";

export interface Tag {
  id: string;
  name: string;
  state: TagState;
  color?: string;
}
