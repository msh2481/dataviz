import type {
  CompareConfig,
  CompareSeriesResponse,
  CorrelationRecord,
  DatasetSummary,
  FeatureSummary,
  HistogramBin,
  OverviewData,
  QuantileSummary,
  TimeLensResponse
} from '../types';

const NUMERIC_FEATURE_RATIO = 0.7;

function createHistogram(count: number, scale: number): HistogramBin[] {
  return Array.from({ length: count }, (_, idx) => ({
    label: `${idx}`,
    value: Math.max(0, Math.round(Math.random() * scale))
  }));
}

function createQuantiles(base: number): QuantileSummary {
  const spread = Math.random() * 2 + 0.5;
  return {
    q05: base - spread * 2,
    q25: base - spread,
    q50: base,
    q75: base + spread,
    q95: base + spread * 2
  };
}

function createMockFeatures(): FeatureSummary[] {
  return Array.from({ length: 25 }).map((_, idx) => {
    const isNumeric = Math.random() < NUMERIC_FEATURE_RATIO;
    const base = Math.random() * 10 - 5;
    const variance = Math.random() * 3 + 0.5;

    return {
      id: `feature_${idx + 1}`,
      name: `Feature ${idx + 1}`,
      type: isNumeric ? 'numeric' : idx % 4 === 0 ? 'datetime' : 'categorical',
      cardinality: isNumeric ? undefined : Math.floor(Math.random() * 12) + 3,
      mean: base,
      median: base + Math.random() * 0.4 - 0.2,
      std: variance,
      min: base - variance * 3,
      max: base + variance * 3,
      pearson: Math.random() * 2 - 1,
      spearman: Math.random() * 2 - 1,
      distance: Math.random(),
      quantiles: createQuantiles(base),
      sparkline: Array.from({ length: 30 }, () => base + Math.random() * variance * 2),
      distribution: createHistogram(24, variance * 40)
    };
  });
}

const mockFeatures = createMockFeatures();

const mockDataset: DatasetSummary = {
  name: 'demo_dataset.parquet',
  rows: 123_456,
  columns: mockFeatures.length + 1,
  sampleSize: 5_000,
  lastUpdated: new Date().toISOString(),
  targets: ['target_return', 'target_drawdown'],
  features: mockFeatures
};

const mockCorrelations: CorrelationRecord[] = mockFeatures.map((feature) => ({
  feature: feature.name,
  pearson: feature.pearson ?? 0,
  spearman: feature.spearman ?? 0,
  distance: feature.distance ?? 0
}));

function createSeries(config: CompareConfig) {
  if (config.chartType === 'scatter' && config.x && config.y) {
    return [
      {
        name: `${config.x} vs ${config.y}`,
        data: Array.from({ length: 350 }, () => [Math.random() * 10, Math.random() * 10])
      }
    ];
  }

  if (config.chartType === 'distribution' && config.x) {
    return [
      {
        name: config.x,
        data: Array.from({ length: 50 }, (_, idx) => [idx, Math.random() * 120])
      }
    ];
  }

  return [];
}

export function fetchOverview(): Promise<OverviewData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ dataset: mockDataset, correlations: mockCorrelations });
    }, 80);
  });
}

export function fetchCompare(config: CompareConfig): Promise<CompareSeriesResponse> {
  return new Promise<CompareSeriesResponse>((resolve) => {
    setTimeout(() => {
      resolve({ config, series: createSeries(config) });
    }, 110);
  });
}

export function fetchTimeLens(
  feature: string,
  target: string,
  window: number,
  orderField: string | null
): Promise<TimeLensResponse> {
  return new Promise((resolve) => {
    const range = Array.from({ length: 60 }, (_, idx) => idx + 1);
    const correlationValues = range.map((idx) => ({
      key: `${idx}`,
      value: Math.sin(idx / 6) * 0.4 + Math.random() * 0.2
    }));

    const trend = range.map((idx) => {
      const mid = Math.sin(idx / 8) * 10 + 50;
      const noise = Math.random() * 4;
      const q25 = mid - noise - 3;
      const q75 = mid + noise + 3;
      return {
        key: `${idx}`,
        median: mid,
        q25,
        q75
      };
    });

    resolve({
      correlation: {
        feature,
        target,
        window,
        orderField,
        values: correlationValues
      },
      featureTrend: trend
    });
  });
}

export function changeSampleSize(delta: number): Promise<DatasetSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newSample = Math.max(500, mockDataset.sampleSize + delta);
      const updated = { ...mockDataset, sampleSize: newSample };
      resolve(updated);
    }, 90);
  });
}
