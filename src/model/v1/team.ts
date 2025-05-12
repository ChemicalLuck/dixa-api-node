export interface Team {
  id: string;
}

export interface TeamWithName extends Team {
  name: string;
}

export interface TeamMember {
  id: string;

  email?: string;
  name?: string;
  phoneNumber?: string;
}
