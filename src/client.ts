import axios, {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { DixaApiError } from "./errors";

interface DixaListResponse<T> {
  data: T[];
  meta?: {
    next?: string;
    previous?: string;
  };
}

export const DEFAULT_BASE_URL = "https://dev.dixa.io";

export interface DixaClientOptions {
  /** Defaults to `https://dev.dixa.io`. */
  baseURL?: string;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /**
   * Replaces the transport axios uses. Intended for tests and for hosts that
   * need to route requests themselves; leave unset for normal use.
   */
  adapter?: AxiosAdapter;
}

export class DixaClient {
  private client: AxiosInstance;

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

  async delete(url: string): Promise<string> {
    return this.handleRequest<string>("DELETE", url, {});
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
   * Issues the request and translates any axios failure into a
   * {@link DixaApiError} that carries the status, method, URL and Dixa error
   * body. Returns the raw axios response so callers that need the response
   * envelope (pagination) can read it.
   */
  private async request<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.request<T>({ ...config, method, url });
    } catch (error) {
      throw DixaApiError.from(error, { method, url });
    }
  }

  private async handleRequest<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.request<T>(method, url, config);
    return response.data;
  }
}

export default DixaClient;
