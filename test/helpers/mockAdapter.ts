import {
  AxiosAdapter,
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

export interface MockReply {
  status?: number;
  statusText?: string;
  data?: unknown;
  headers?: Record<string, string>;
  /**
   * Reject with a transport-level error (no response) instead of replying,
   * as axios does for a connection failure or timeout.
   */
  error?: { message: string; code: string };
}

export interface RecordedRequest {
  method: string;
  url: string;
  /** Full URL as axios resolved it, including any serialized query string. */
  fullUrl: string;
  params: unknown;
  /** Request body, JSON-parsed when possible. */
  body: unknown;
  headers: Record<string, unknown>;
}

export interface MockAdapter {
  adapter: AxiosAdapter;
  requests: RecordedRequest[];
}

function parseBody(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function resolveUrl(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (config.baseURL ?? "").replace(/\/+$/, "");
  return url === "" ? base : `${base}/${url.replace(/^\/+/, "")}`;
}

/**
 * An axios adapter that replays the given replies in order and records every
 * request it saw. Throws if the client makes more requests than there are
 * replies, so an unexpected extra call fails the test loudly.
 */
export function createMockAdapter(
  replies: MockReply | MockReply[],
): MockAdapter {
  const queue = Array.isArray(replies) ? [...replies] : [replies];
  const requests: RecordedRequest[] = [];

  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";

    requests.push({
      method,
      url,
      fullUrl: resolveUrl(config),
      params: config.params,
      body: parseBody(config.data),
      headers: { ...(config.headers ?? {}) },
    });

    const reply = queue.shift();
    if (!reply) {
      throw new Error(
        `mock adapter: unexpected request #${requests.length} (${method} ${url}) — no reply queued`,
      );
    }

    if (reply.error) {
      throw new AxiosError(
        reply.error.message,
        reply.error.code,
        config,
        {},
        undefined,
      );
    }

    const status = reply.status ?? 200;
    const response: AxiosResponse = {
      status,
      statusText: reply.statusText ?? STATUS_TEXT[status] ?? "",
      data: reply.data,
      headers: new AxiosHeaders(reply.headers),
      config,
      request: {},
    };

    // Non-2xx settling happens inside the adapter in axios, so a mock adapter
    // has to reject the same way the real one does.
    if (status < 200 || status >= 300) {
      throw new AxiosError(
        `Request failed with status code ${status}`,
        status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST",
        config,
        {},
        response,
      );
    }

    return response;
  };

  return { adapter, requests };
}
