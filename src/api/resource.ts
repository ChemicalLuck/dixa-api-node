import DixaClient from "../client";

export type DixaVersion = "v1" | "beta";

abstract class DixaResource {
  protected abstract resource: string;
  protected abstract version: DixaVersion;
  protected client: DixaClient;

  protected constructor(client: DixaClient) {
    this.client = client;
  }

  protected buildUrl(path: string = ""): string {
    return `${this.version}/${this.resource}${path}`;
  }

  protected _get<T>(url: string, query?: Record<string, any>): Promise<T> {
    return this.client.get(url, query);
  }

  protected _post<T>(url: string, body?: unknown): Promise<T> {
    return this.client.post(url, body);
  }

  protected _put<T>(url: string, body?: unknown): Promise<T> {
    return this.client.put(url, body);
  }

  protected _delete(url: string): Promise<string> {
    return this.client.delete(url);
  }

  protected _patch<T>(url: string, body?: unknown): Promise<T> {
    return this.client.patch(url, body);
  }

  protected _paginate<T>(
    url: string,
    query?: Record<string, any>,
  ): Promise<T[]> {
    return this.client.paginate(url, query);
  }
}

export default DixaResource;
