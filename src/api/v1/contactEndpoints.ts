import DixaResource, { DixaVersion } from "../resource";
import { ContactEndpoint } from "../../model/v1/contactEndpoint";
import DixaClient from "../../client";

export type ContactEndpointListQuery = {
  _type?: "EmailEndpoint" | "TelephonyEndpoint";
};

export class ContactEndpointsResource extends DixaResource {
  protected resource = "contact-endpoints";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async get(contactEndpointId: string): Promise<ContactEndpoint> {
    return this._get(this.buildUrl(`/${contactEndpointId}`));
  }

  async list(query?: ContactEndpointListQuery): Promise<ContactEndpoint[]> {
    return this._paginate(this.buildUrl(), query);
  }
}
