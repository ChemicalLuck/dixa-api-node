import DixaResource, { DixaVersion } from "../resource";
import { Tag } from "../../model/v1/tag";
import DixaClient from "../../client";

export interface TagCreateBody {
  name: string;
  color?: string;
}

export class TagsResource extends DixaResource {
  protected resource = "tags";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async activate(tagId: string): Promise<void> {
    return this._patch(this.buildUrl(`/${tagId}/activate`));
  }

  async create(body: TagCreateBody): Promise<Tag> {
    return this._post(this.buildUrl(), body);
  }

  async deactivate(tagId: string): Promise<void> {
    return this._patch(this.buildUrl(`/${tagId}/deactivate`));
  }

  async get(tagId: string): Promise<Tag> {
    return this._get(this.buildUrl(`/${tagId}`));
  }

  async list(): Promise<Tag[]> {
    return this._paginate(this.buildUrl());
  }
}
