export type FeatureType = 'numeric' | 'categorical' | 'datetime';

export interface QuantileSummary {
  q05: number;
  q25: number;
  q50: number;
  q75: number;
  q95: number;
}

export interface HistogramBin {
  label: string;
  value: number;
}

export interface FeatureSummary {
  id: string;
  name: string;
  type: FeatureType;
  cardinality?: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  pearson?: number;
  spearman?: number;
  distance?: number;
  quantiles?: QuantileSummary;
  sparkline: number[];
  distribution: HistogramBin[];
}

export interface DatasetSummary {
  name: string;
  rows: number;
  columns: number;
  sampleSize: number;
  lastUpdated: string;
  targets: string[];
  features: FeatureSummary[];
}

export interface CompareConfig {
  x: string | null;
  y: string | null;
  color: string | null;
  chartType: 'scatter' | 'distribution';
}

export interface CorrelationRecord {
  feature: string;
  pearson: number;
  spearman: number;
  distance: number;
}

export interface TimeSeriesPoint {
  key: string;
  value: number;
}

export interface TimeCorrelationSeries {
  feature: string;
  target: string;
  window: number;
  orderField: string | null;
  values: TimeSeriesPoint[];
}

export interface FeatureTrendPoint {
  key: string;
  median: number;
  q25: number;
  q75: number;
}

export interface TimeLensResponse {
  correlation: TimeCorrelationSeries;
  featureTrend: FeatureTrendPoint[];
}

export interface OverviewData {
  dataset: DatasetSummary;
  correlations: CorrelationRecord[];
}

export interface CompareSeriesResponse {
  config: CompareConfig;
  series: Array<{ name: string; data: Array<[number, number]> }>;
}

