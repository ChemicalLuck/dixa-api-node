import axios, {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { DixaApiError } from "./errors";
import {
  computeRetryDelay,
  DixaRetryOptions,
  ResolvedRetryPolicy,
  resolveRetryPolicy,
  shouldRetry,
} from "./retry";

interface DixaListResponse<T> {
  data: T[];
  meta?: {
    next?: string;
    previous?: string;
  };
}

/**
 * Keys Dixa uses at the envelope level. A body is only unwrapped when it has a
 * `data` key and nothing outside this set, so a resource that happens to have
 * its own `data` field is never mangled.
 */
const ENVELOPE_KEYS = new Set(["data", "meta"]);

/**
 * Dixa replies `{ "data": ..., "meta": ... }`. Returns the payload inside the
 * envelope, or the body untouched if it is not an envelope — some endpoints
 * reply with no envelope at all, and a 204 has no body.
 */
function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function unwrapEnvelope<T>(body: unknown): T {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return body as T;
  }

  const record = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "data")) return body as T;
  for (const key of Object.keys(record)) {
    if (!ENVELOPE_KEYS.has(key)) return body as T;
  }

  return record.data as T;
}

export const DEFAULT_BASE_URL = "https://dev.dixa.io";

/**
 * A hung request would otherwise hang the caller forever, which is fatal in a
 * serverless function that pays for the wall clock.
 */
export const DEFAULT_TIMEOUT_MS = 30_000;

export interface DixaLogger {
  debug?: (message: string, context?: Record<string, unknown>) => void;
  warn?: (message: string, context?: Record<string, unknown>) => void;
}

export interface DixaClientOptions {
  /** Defaults to `https://dev.dixa.io`. */
  baseURL?: string;
  /**
   * Per-request timeout in milliseconds. Defaults to 30000. Pass 0 to wait
   * indefinitely, as axios does by default.
   */
  timeout?: number;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /**
   * Retry policy for 429, 5xx and transport failures. Pass `false` to disable,
   * a number to set the retry count, or an object to tune it. See
   * {@link DixaRetryOptions}.
   */
  retry?: DixaRetryOptions | boolean | number;
  /**
   * Called on retries and failures. Nothing is logged unless this is set — a
   * library has no business writing to the host's console.
   */
  logger?: DixaLogger;
  /**
   * Replaces the transport axios uses. Intended for tests and for hosts that
   * need to route requests themselves; leave unset for normal use.
   */
  adapter?: AxiosAdapter;
}

export class DixaClient {
  private client: AxiosInstance;
  private retryPolicy: ResolvedRetryPolicy;
  private logger?: DixaLogger;

  constructor(
    apiKey: string,
    optionsOrBaseURL: DixaClientOptions | string = {},
  ) {
    const options: DixaClientOptions =
      typeof optionsOrBaseURL === "string"
        ? { baseURL: optionsOrBaseURL }
        : optionsOrBaseURL;

    this.logger = options.logger;
    this.client = axios.create({
      baseURL: options.baseURL ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      headers: {
        Authorization: apiKey,
        ...options.headers,
      },
      ...(options.adapter ? { adapter: options.adapter } : {}),
    });

    this.retryPolicy = resolveRetryPolicy(options.retry);
  }

  async get<T>(url: string, query?: Record<string, any>): Promise<T> {
    return this.handleRequest<T>("GET", url, { params: query });
  }

  async post<T>(url: string, payload?: unknown): Promise<T> {
    return this.handleRequest<T>("POST", url, { data: payload });
  }

  async put<T>(url: string, payload?: unknown): Promise<T> {
    return this.handleRequest<T>("PUT", url, { data: payload });
  }

  async delete<T = void>(url: string, payload?: unknown): Promise<T> {
    // axios only sends a DELETE body when it is passed as config.data.
    return this.handleRequest<T>("DELETE", url, { data: payload });
  }

  async patch<T>(url: string, payload?: unknown): Promise<T> {
    return this.handleRequest<T>("PATCH", url, { data: payload });
  }

  async paginate<T>(url: string, query?: Record<string, any>): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | undefined = url;
    // meta.next already carries the query it was produced from, encoded in
    // pageKey, so query is only sent with the first request. Re-sending it
    // would duplicate or contradict the cursor.
    let params = query;
    const seen = new Set<string>();

    while (nextUrl) {
      if (seen.has(nextUrl)) {
        this.logger?.warn?.("Dixa pagination stopped on a repeated cursor", {
          url: nextUrl,
          collected: items.length,
        });
        break;
      }
      seen.add(nextUrl);

      const response: AxiosResponse<DixaListResponse<T> | undefined> =
        await this.request<DixaListResponse<T> | undefined>("GET", nextUrl, {
          params,
        });
      params = undefined;

      const page = response.data;
      // A 204 or empty body means there was nothing to page through.
      if (page === undefined || page === null || (page as unknown) === "")
        break;

      if (!Array.isArray(page.data)) {
        throw new DixaApiError(
          `Dixa GET ${nextUrl} did not return a list: expected "data" to be an array, got ${describeType(page.data)}`,
          {
            method: "GET",
            url: nextUrl,
            status: response.status,
            statusText: response.statusText,
            body: page,
          },
        );
      }

      items.push(...page.data);
      nextUrl = page.meta?.next;
    }

    return items;
  }

  /**
   * Issues the request, retrying per the configured policy, and translates any
   * axios failure into a {@link DixaApiError} that carries the status, method,
   * URL and Dixa error body. Returns the raw axios response so callers that
   * need the response envelope (pagination) can read it.
   */
  private async request<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const policy = this.retryPolicy;
    let attempt = 0;

    for (;;) {
      try {
        return await this.client.request<T>({ ...config, method, url });
      } catch (rawError) {
        const error = DixaApiError.from(rawError, { method, url });
        const remaining = policy.retries - attempt;

        if (remaining <= 0 || !shouldRetry(error, method, policy)) {
          this.logger?.warn?.(error.message, {
            method,
            url,
            status: error.status,
            attempts: attempt + 1,
          });
          throw error;
        }

        attempt += 1;
        const delay = computeRetryDelay(error, attempt, policy);

        // Waiting out a very long Retry-After is worse than failing fast: the
        // caller may be on a request path with its own deadline, and the error
        // carries retryAfterMs so it can decide for itself.
        if (delay.exceedsMaxRetryAfter) {
          this.logger?.warn?.(
            `Retry-After of ${delay.delayMs}ms exceeds maxRetryAfterMs; not retrying`,
            { method, url, status: error.status },
          );
          throw error;
        }

        this.logger?.debug?.(
          `Retrying after ${delay.delayMs}ms: ${error.message}`,
          {
            method,
            url,
            status: error.status,
            attempt,
          },
        );
        policy.onRetry?.({
          attempt,
          remaining: remaining - 1,
          delayMs: delay.delayMs,
          fromRetryAfter: delay.fromRetryAfter,
          error,
        });

        await policy.sleep(delay.delayMs);
      }
    }
  }

  private async handleRequest<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.request<unknown>(method, url, config);

    // 204 No Content, and any empty body, carry nothing to unwrap.
    if (
      response.status === 204 ||
      response.data === "" ||
      response.data === undefined
    ) {
      return undefined as T;
    }

    return unwrapEnvelope<T>(response.data);
  }
}

export default DixaClient;
