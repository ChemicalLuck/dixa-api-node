import axios, { AxiosInstance, AxiosResponse } from "axios";

interface DixaListResponse<T> {
  data: T[];
  meta?: {
    next?: string;
    previous?: string;
  };
}

interface DixaResponse<T> {
  data: T;
}

interface DixaDeleteResponse {
  message?: string;
}

class DixaApiError extends Error {
  constructor(
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "DixaApiError";
  }
}

export class DixaClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseURL: string = "https://dev.dixa.io") {
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: apiKey,
      },
    });
  }

  async get<T>(url: string, query?: Record<string, any>): Promise<T> {
    return this.handleRequest<T>(() =>
      this.client.get<DixaResponse<T>>(url, { params: query }),
    );
  }

  async post<T>(url: string, payload?: unknown): Promise<T> {
    return this.handleRequest<T>(() =>
      this.client.post<DixaResponse<T>>(url, payload),
    );
  }

  async put<T>(url: string, payload?: unknown): Promise<T> {
    return this.handleRequest<T>(() =>
      this.client.put<DixaResponse<T>>(url, payload),
    );
  }

  async delete(url: string): Promise<string> {
    return this.handleRequest<string>(async () =>
      this.client.delete<DixaDeleteResponse>(url),
    );
  }

  async patch<T>(url: string, payload?: unknown): Promise<T> {
    return this.handleRequest<T>(() =>
      this.client.patch<DixaResponse<T>>(url, payload),
    );
  }

  async paginate<T>(url: string, query?: Record<string, any>): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string = url;

    while (nextUrl) {
      try {
        const response = await this.client.get<DixaListResponse<T>>(nextUrl, {
          params: query,
        });
        const responseData = response.data;
        items.push(...responseData.data);
        nextUrl = responseData.meta?.next ?? "";
      } catch (error) {
        // Optional: integrate telemetry/logging here
        console.error("API Error:", error);
        throw new DixaApiError("Request failed", error);
      }
    }

    return items;
  }

  private async handleRequest<T>(
    requestFn: () => Promise<AxiosResponse<any>>,
  ): Promise<T> {
    try {
      const response = await requestFn();
      return response.data;
    } catch (error) {
      // Optional: integrate telemetry/logging here
      console.error("API Error:", error);
      throw new DixaApiError("Request failed", error);
    }
  }
}

export default DixaClient;
