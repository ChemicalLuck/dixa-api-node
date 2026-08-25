import type { AxiosError } from "axios";

/**
 * Brand used by {@link isDixaApiError}. A plain `instanceof` check is unreliable
 * because a consumer can end up with both the ESM and CJS build of this package
 * loaded at once (two distinct classes), so the guard looks for this instead.
 */
const DIXA_API_ERROR = Symbol.for(
  "@chemicalluck/dixa-api-node.DixaApiError",
);

const BODY_PREVIEW_LIMIT = 500;

export interface DixaApiErrorContext {
  /** Uppercased HTTP method, e.g. `GET`. */
  method?: string;
  /** Request URL as passed to the client, e.g. `v1/conversations/123`. */
  url?: string;
  status?: number;
  statusText?: string;
  /** Parsed body of the failing response, when Dixa sent one. */
  body?: unknown;
  /** Axios error code, e.g. `ECONNABORTED`, `ECONNRESET`. */
  code?: string;
  /** `Retry-After` from the response, resolved to milliseconds. */
  retryAfterMs?: number;
  originalError?: unknown;
}

function truncate(value: string): string {
  return value.length > BODY_PREVIEW_LIMIT
    ? `${value.slice(0, BODY_PREVIEW_LIMIT)}…`
    : value;
}

/** Renders a response body for the error message, or nothing if it is empty. */
function previewBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed === "" ? undefined : truncate(trimmed);
  }
  try {
    const json = JSON.stringify(body);
    return json === undefined || json === "{}" ? undefined : truncate(json);
  } catch {
    return undefined;
  }
}

function buildMessage(
  context: DixaApiErrorContext,
  reason: string | undefined,
): string {
  const target =
    [context.method, context.url].filter(Boolean).join(" ") || "request";
  let message = `Dixa ${target} failed`;

  if (context.status !== undefined) {
    message += `: ${context.status}`;
    if (context.statusText) message += ` ${context.statusText}`;
  } else if (reason) {
    message += `: ${reason}`;
  }

  const preview = previewBody(context.body);
  if (preview) {
    message += ` — ${preview}`;
  } else if (context.status === undefined && context.code) {
    message += ` (${context.code})`;
  }

  return message;
}

/**
 * Every failure surfaced by this client. Carries the HTTP status and the Dixa
 * error body so callers can classify a failure without reaching into
 * `originalError`.
 */
export class DixaApiError extends Error {
  readonly [DIXA_API_ERROR] = true;

  /** HTTP status, or `undefined` for a network error/timeout (no response). */
  readonly status?: number;
  readonly statusText?: string;
  /** Uppercased HTTP method, e.g. `GET`. */
  readonly method?: string;
  /** Request URL as passed to the client, e.g. `v1/conversations/123`. */
  readonly url?: string;
  /** Parsed body of the failing response, when Dixa sent one. */
  readonly body?: unknown;
  /** Axios error code, e.g. `ECONNABORTED`, `ECONNRESET`. */
  readonly code?: string;
  /** `Retry-After` from the response, resolved to milliseconds. */
  readonly retryAfterMs?: number;
  /** The underlying axios error. Kept for back-compat; prefer the fields above. */
  readonly originalError?: unknown;

  constructor(message: string, context: DixaApiErrorContext = {}) {
    super(message);
    this.name = "DixaApiError";
    this.status = context.status;
    this.statusText = context.statusText;
    this.method = context.method;
    this.url = context.url;
    this.body = context.body;
    this.code = context.code;
    this.retryAfterMs = context.retryAfterMs;
    this.originalError = context.originalError;
    Object.setPrototypeOf(this, DixaApiError.prototype);
  }

  /** No response was received — connection failure, DNS, or timeout. */
  get isNetworkError(): boolean {
    return this.status === undefined;
  }

  get isTimeout(): boolean {
    return this.code === "ECONNABORTED" || this.code === "ETIMEDOUT";
  }

  /** 401/403 — the API token is missing, wrong, or lacks the required scope. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status !== undefined && this.status >= 500;
  }

  /**
   * Whether retrying could plausibly succeed. The client already retries these
   * by default; this is for callers running their own outer retry (e.g. deciding
   * whether to fail a webhook so the sender redelivers).
   */
  get isRetryable(): boolean {
    if (this.status === undefined) return true;
    return this.status === 408 || this.status === 429 || this.status >= 500;
  }

  /** Best-effort human-readable message from the Dixa error body, if any. */
  get apiMessage(): string | undefined {
    const body = this.body;
    if (typeof body === "string") return body.trim() || undefined;
    if (body === null || typeof body !== "object") return undefined;
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "description"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim() !== "") return value;
    }
    return undefined;
  }

  static from(
    error: unknown,
    context: Pick<DixaApiErrorContext, "method" | "url">,
  ): DixaApiError {
    if (isDixaApiError(error)) return error;

    const axiosError = error as AxiosError | undefined;
    const response = axiosError?.response;
    const full: DixaApiErrorContext = {
      method: (
        context.method ??
        axiosError?.config?.method ??
        ""
      ).toUpperCase(),
      url: context.url ?? axiosError?.config?.url,
      status: response?.status,
      statusText: response?.statusText,
      body: response?.data,
      code: axiosError?.code,
      retryAfterMs: parseRetryAfter(response?.headers),
      originalError: error,
    };
    if (full.method === "") delete full.method;

    const reason =
      typeof axiosError?.message === "string" ? axiosError.message : undefined;
    return new DixaApiError(buildMessage(full, reason), full);
  }
}

/**
 * Type guard for {@link DixaApiError}. Prefer this over `instanceof`: it also
 * matches errors thrown by a different copy of this package.
 */
export function isDixaApiError(error: unknown): error is DixaApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<symbol, unknown>)[DIXA_API_ERROR] === true
  );
}

/**
 * Resolves a `Retry-After` header to milliseconds. Handles both forms allowed by
 * RFC 9110: delta-seconds and an HTTP-date. Returns `undefined` if absent or
 * unparseable, and never a negative value.
 */
export function parseRetryAfter(
  headers: unknown,
  now: number = Date.now(),
): number | undefined {
  if (headers === null || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const raw = record["retry-after"] ?? record["Retry-After"];
  if (raw === undefined || raw === null) return undefined;

  const value = String(raw).trim();
  if (value === "") return undefined;

  if (/^\d+$/.test(value)) return Number(value) * 1000;

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}
