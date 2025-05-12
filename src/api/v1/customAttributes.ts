import DixaResource, { DixaVersion } from "../resource";
import { CustomAttributeDefinition } from "../../model/v1/customAttribute";
import DixaClient from "../../client";

export class CustomAttributesResource extends DixaResource {
  protected resource = "custom-attributes";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async list(): Promise<CustomAttributeDefinition[]> {
    return this._paginate(this.buildUrl());
  }
}
