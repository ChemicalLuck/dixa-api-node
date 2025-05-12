// Discriminated union error types
export interface EmptyPatchSet {
  id: string;
  message: string;
  _type: "EmptyPatchSet";
}

export interface ErrorResponse {
  message: string;
  _type: "ErrorResponse";
}

export interface Infrastructure {
  id: string;
  message: string;
  _type: "Infrastructure";
}

export interface Integrity {
  id: string;
  message: string;
  _type: "Integrity";
}

export interface NotFound {
  id: string;
  message: string;
  _type: "NotFound";
}

export interface Validation {
  id?: string;
  message: string;
  _type: "Validation";
}

// Union of all error response types
export type BulkActionFailureError =
  | EmptyPatchSet
  | ErrorResponse
  | Infrastructure
  | Integrity
  | NotFound
  | Validation;

// Main failure wrapper
export interface BulkActionFailure {
  error: BulkActionFailureError;
  _type: "BulkActionFailure";
}

export interface BulkActionSuccess<T> {
  data: T[];
  _type: "BulkActionSuccess";
}

export type BulkActionOutcome<T> = BulkActionSuccess<T> | BulkActionFailure;
