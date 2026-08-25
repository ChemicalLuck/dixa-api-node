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

export interface DixaClientOptions {
  /** Defaults to `https://dev.dixa.io`. */
  baseURL?: string;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /**
   * Retry policy for 429, 5xx and transport failures. Pass `false` to disable,
   * a number to set the retry count, or an object to tune it. See
   * {@link DixaRetryOptions}.
   */
  retry?: DixaRetryOptions | boolean | number;
  /**
   * Replaces the transport axios uses. Intended for tests and for hosts that
   * need to route requests themselves; leave unset for normal use.
   */
  adapter?: AxiosAdapter;
}

export class DixaClient {
  private client: AxiosInstance;
  private retryPolicy: ResolvedRetryPolicy;

  constructor(
    apiKey: string,
    optionsOrBaseURL: DixaClientOptions | string = {},
  ) {
    const options: DixaClientOptions =
      typeof optionsOrBaseURL === "string"
        ? { baseURL: optionsOrBaseURL }
        : optionsOrBaseURL;

    this.client = axios.create({
      baseURL: options.baseURL ?? DEFAULT_BASE_URL,
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
    let nextUrl: string = url;

    while (nextUrl) {
      const response = await this.request<DixaListResponse<T>>("GET", nextUrl, {
        params: query,
      });
      const responseData = response.data;
      items.push(...responseData.data);
      nextUrl = responseData.meta?.next ?? "";
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

        if (remaining <= 0 || !shouldRetry(error, method, policy)) throw error;

        attempt += 1;
        const delay = computeRetryDelay(error, attempt, policy);

        // Waiting out a very long Retry-After is worse than failing fast: the
        // caller may be on a request path with its own deadline, and the error
        // carries retryAfterMs so it can decide for itself.
        if (delay.exceedsMaxRetryAfter) throw error;

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
