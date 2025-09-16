import type {
  CompareConfig,
  CorrelationRecord,
  DatasetSummary,
  TimeCorrelationSeries
} from '../types';

export type OverviewData = {
  dataset: DatasetSummary;
  correlations: CorrelationRecord[];
};

export type CompareResponse = {
  config: CompareConfig;
  series: Array<{ name: string; data: Array<[number, number]> }>;
};

export type TimeLensResponse = {
  correlation: TimeCorrelationSeries;
  featureTrend: Array<{ timestamp: string; value: number }>;
};

const mockFeatures = Array.from({ length: 20 }).map((_, idx) => {
  const variance = Math.random() * 2 + 0.5;
  return {
    id: `feature_${idx + 1}`,
    name: `Feature ${idx + 1}`,
    type: idx % 5 === 0 ? 'categorical' : idx % 4 === 0 ? 'datetime' : 'numeric',
    missingRate: Math.random() * 0.15,
    cardinality: idx % 5 === 0 ? Math.floor(Math.random() * 10) + 3 : undefined,
    mean: variance * 10,
    median: variance * 9,
    std: variance,
    min: variance * -4,
    max: variance * 12,
    pearson: Math.random() * 2 - 1,
    spearman: Math.random() * 2 - 1,
    distance: Math.random(),
    sparkline: Array.from({ length: 20 }, () => Math.random() * variance)
  };
});

const mockDataset: DatasetSummary = {
  name: 'demo_dataset.parquet',
  rows: 123456,
  columns: mockFeatures.length + 1,
  sampleSize: 5000,
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

function createSeries(config: CompareConfig): CompareResponse['series'] {
  if (config.chartType === 'scatter' && config.x && config.y) {
    return [
      {
        name: `${config.x} vs ${config.y}`,
        data: Array.from({ length: 400 }, () => [Math.random() * 10, Math.random() * 10])
      }
    ];
  }

  if (config.chartType === 'distribution' && config.x) {
    return [
      {
        name: config.x,
        data: Array.from({ length: 40 }, (_, idx) => [idx, Math.random() * 100])
      }
    ];
  }

  return [];
}

export function fetchOverview(): Promise<OverviewData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ dataset: mockDataset, correlations: mockCorrelations });
    }, 120);
  });
}

export function fetchCompare(config: CompareConfig): Promise<CompareResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ config, series: createSeries(config) });
    }, 160);
  });
}

export function fetchTimeLens(feature: string, target: string, window: number): Promise<TimeLensResponse> {
  return new Promise((resolve) => {
    const now = Date.now();
    const timeSeries = Array.from({ length: 40 }, (_, idx) => ({
      timestamp: new Date(now - idx * 7 * 24 * 3600 * 1000).toISOString(),
      value: Math.random() * 2 - 1
    })).reverse();

    const trend = timeSeries.map((point) => ({
      timestamp: point.timestamp,
      value: Math.random() * 100
    }));

    resolve({
      correlation: { feature, target, window, values: timeSeries },
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
    }, 100);
  });
}
