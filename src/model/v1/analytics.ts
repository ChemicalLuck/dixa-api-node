// ----- Filters -----
export interface Filter {
  attribute: string;
  values?: string[];
}

export interface Interval {
  start: string;
  end: string;
}

export type Preset = {
  value:
    | "PreviousQuarter"
    | "ThisWeek"
    | "PreviousWeek"
    | "Yesterday"
    | "Today"
    | "ThisMonth"
    | "PreviousMonth"
    | "ThisQuarter"
    | "ThisYear";
};

export interface FilterValue {
  value: string;
  label?: string;
}

// ----- Measures -----
export type Measure =
  | "Min"
  | "Max"
  | "Sum"
  | "Percentage"
  | "StdDev"
  | "Average"
  | "Count";
export type DoubleMeasure = Exclude<Measure, "Count">;
export type LongMeasure = "Count";

// ----- Aggregate Values -----
export interface LongAggregateValue {
  measure?: LongMeasure;
  value?: number;
}

export interface DoubleAggregateValue {
  measure?: DoubleMeasure;
  value?: number;
}

export interface MetricData {
  aggregates: Array<DoubleAggregateValue | LongAggregateValue>;
  id?: string;
}

// ----- Field Value Types -----
export interface BooleanField {
  value: boolean;
}

export interface DoubleField {
  value: number;
}

export interface InstantField {
  value: string;
}

export interface IntField {
  value: number;
}

export interface LongField {
  value: number;
}

export interface StringField {
  value: string;
}

export interface TimestampField {
  value: string;
}

export interface UUIDField {
  value: string;
}

export interface ListField {
  value: Array<
    | BooleanField
    | DoubleField
    | InstantField
    | IntField
    | LongField
    | StringField
    | TimestampField
    | UUIDField
  >;
}

export type MetricRecordValue =
  | BooleanField
  | DoubleField
  | InstantField
  | IntField
  | ListField
  | LongField
  | StringField
  | TimestampField
  | UUIDField;

// ----- Record Fields -----
export interface Field {
  name: string;
  field?: MetricRecordValue;
}

export interface MetricRecord {
  fields?: Field[];
  primaryTimestampField?: TimestampField;
  value?: MetricRecordValue;
}

// ----- Metadata -----
export interface AggregateMetadata {
  measure: Measure;
  description?: string;
}

export interface FilterMetadata {
  filterAttribute: string;
  description?: string;
}

export interface MetricMetadata {
  id: string;
  aggregations?: AggregateMetadata[];
  description?: string;
  filters?: FilterMetadata[];
  relatedREcordIds?: string[];
}

export interface FieldMetadata {
  name: string;
  description: string;
  nullable: boolean;
}

export interface MetricRecordMetadata {
  id: string;
  description: string;
  fieldsMetadata?: FieldMetadata[];
  filters?: FilterMetadata[];
  relatedMetricIds?: string[];
}
