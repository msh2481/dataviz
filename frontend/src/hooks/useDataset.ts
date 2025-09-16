import { useCallback, useEffect, useState } from 'react';
import type {
  CompareConfig,
  DatasetSummary,
  FeatureSummary,
  TimeLensResponse,
  CompareSeriesResponse
} from '../types';
import { changeSampleSize, fetchCompare, fetchOverview, fetchTimeLens } from '../services/dataService';

type TabId = 'overview' | 'compare' | 'targets' | 'timeline';

export function useDataset() {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureSummary | null>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [compareConfig, setCompareConfig] = useState<CompareConfig>({
    x: null,
    y: null,
    color: null,
    chartType: 'distribution'
  });
  const [compareSeries, setCompareSeries] = useState<CompareSeriesResponse['series']>([]);
  const [timeLens, setTimeLens] = useState<TimeLensResponse | null>(null);
  const [timeOrder, setTimeOrder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then(({ dataset }) => {
        setSummary(dataset);
        setActiveFeature(dataset.features[0]);
      })
      .catch(() => setError('Unable to load dataset overview'))
      .finally(() => setIsLoading(false));
  }, []);

  const refreshCompare = useCallback((config: CompareConfig) => {
    setCompareConfig(config);
    fetchCompare(config).then((response) => setCompareSeries(response.series));
  }, []);

  const loadTimeLens = useCallback(
    (featureId: string, target: string, window: number, orderField: string | null) => {
      setTimeOrder(orderField);
      fetchTimeLens(featureId, target, window, orderField).then((response) => setTimeLens(response));
    },
    []
  );

  const adjustSample = useCallback((direction: 'increase' | 'decrease') => {
    if (!summary) return;
    const delta = direction === 'increase' ? 2_500 : -2_500;
    changeSampleSize(delta).then((updated) => setSummary(updated));
  }, [summary]);

  return {
    summary,
    activeFeature,
    setActiveFeature,
    tab,
    setTab,
    compareConfig,
    compareSeries,
    refreshCompare,
    timeLens,
    timeOrder,
    loadTimeLens,
    adjustSample,
    isLoading,
    error
  } as const;
}
