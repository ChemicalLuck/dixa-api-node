import DixaResource, { DixaVersion } from "../resource";
import {
  Filter,
  FilterValue,
  Interval,
  MetricData,
  MetricMetadata,
  MetricRecord,
  MetricRecordMetadata,
  Preset,
} from "../../model/v1/analytics";
import DixaClient from "../../client";

export interface AnalyticsGetMetricDataBody {
  aggregations: string[];
  filters?: Filter[];
  id: string;
  periodFilter: Interval | Preset;
  timezone: string;
}

export interface AnalyticsGetMetricRecordsDataBody {
  filters?: Filter[];
  id: string;
  periodFilter: Interval | Preset;
  timezone: string;
}

export class AnalyticsResource extends DixaResource {
  protected resource = "analytics";
  protected version: DixaVersion = "v1";

  constructor(client: DixaClient) {
    super(client);
  }

  async filter(filterAttribute: string): Promise<FilterValue[]> {
    return this._paginate<FilterValue>(
      this.buildUrl(`/filter/${filterAttribute}`),
    );
  }

  async getMetricData(body: AnalyticsGetMetricDataBody): Promise<MetricData> {
    return this._post(this.buildUrl("/metrics"), body);
  }

  async getMetricRecordsData(
    body: AnalyticsGetMetricRecordsDataBody,
  ): Promise<MetricRecord[]> {
    return this._post(this.buildUrl("/records"), body);
  }

  async getMetricDescription(metricId: string): Promise<MetricMetadata> {
    return this._get(this.buildUrl(`/metrics/${metricId}`));
  }

  async getMetricRecordDescription(
    recordId: string,
  ): Promise<MetricRecordMetadata> {
    return this._get(this.buildUrl(`/records/${recordId}`));
  }

  async getMetricRecordsCatalogue(
    query?: Record<string, any>,
  ): Promise<MetricRecordMetadata[]> {
    return this._paginate(this.buildUrl("/records"), query);
  }

  async getMetricsCatalogue(
    query?: Record<string, any>,
  ): Promise<MetricMetadata[]> {
    return this._paginate(this.buildUrl("/metrics"), query);
  }
}
