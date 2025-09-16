export type FeatureType = 'numeric' | 'categorical' | 'datetime';

export interface FeatureSummary {
  id: string;
  name: string;
  type: FeatureType;
  missingRate: number;
  cardinality?: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  pearson?: number;
  spearman?: number;
  distance?: number;
  sparkline: number[];
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
  chartType: 'scatter' | 'distribution' | 'heatmap';
}

export interface CorrelationRecord {
  feature: string;
  pearson: number;
  spearman: number;
  distance: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TimeCorrelationSeries {
  feature: string;
  target: string;
  window: number;
  values: TimeSeriesPoint[];
}
