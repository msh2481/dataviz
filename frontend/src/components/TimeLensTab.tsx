import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { DatasetSummary, FeatureSummary, TimeLensResponse } from '../types';

interface TimeLensTabProps {
  dataset: DatasetSummary;
  feature: FeatureSummary | null;
  data: TimeLensResponse | null;
  orderField: string | null;
  onRequest: (featureId: string, target: string, window: number, orderField: string | null) => void;
}

const ROLLING_WINDOWS = [7, 14, 30, 60];
const DEFAULT_ORDER = '__dataset__';

export function TimeLensTab({ dataset, feature, data, orderField, onRequest }: TimeLensTabProps) {
  const [target, setTarget] = useState(() => dataset.targets[0]);
  const [window, setWindow] = useState(ROLLING_WINDOWS[1]);
  const [order, setOrder] = useState<string>(orderField ?? DEFAULT_ORDER);

  useEffect(() => {
    setOrder(orderField ?? DEFAULT_ORDER);
  }, [orderField]);

  useEffect(() => {
    if (feature) {
      onRequest(feature.id, target, window, order === DEFAULT_ORDER ? null : order);
    }
  }, [feature, target, window, order, onRequest]);

  const orderOptions = useMemo(
    () => [
      { value: DEFAULT_ORDER, label: 'Dataset order' },
      ...dataset.features.map((item) => ({ value: item.id, label: `Sort by ${item.name}` }))
    ],
    [dataset.features]
  );

  if (!feature) {
    return <div className="empty-state">Select a feature from the catalog to inspect temporal behaviour.</div>;
  }

  const corrKeys = data?.correlation.values.map((point) => point.key) ?? [];
  const corrValues = data?.correlation.values.map((point) => point.value) ?? [];

  const correlationOptions = {
    tooltip: { trigger: 'axis' },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10 }],
    xAxis: { type: 'category', data: corrKeys, name: data?.correlation.orderField ?? 'order' },
    yAxis: { type: 'value', min: -1, max: 1 },
    series: [
      {
        name: 'Rolling correlation',
        type: 'line',
        smooth: true,
        data: corrValues,
        symbol: 'none',
        lineStyle: { color: '#312e81', width: 2 },
        areaStyle: { color: 'rgba(99, 102, 241, 0.18)' }
      }
    ]
  };

  const trendKeys = data?.featureTrend.map((point) => point.key) ?? [];
  const lowerBand = data?.featureTrend.map((point) => point.q25) ?? [];
  const iqrHeight = data?.featureTrend.map((point) => point.q75 - point.q25) ?? [];
  const medianValues = data?.featureTrend.map((point) => point.median) ?? [];

  const trendOptions = {
    tooltip: { trigger: 'axis' },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10 }],
    xAxis: { type: 'category', data: trendKeys, name: data?.correlation.orderField ?? 'order' },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Lower quartile',
        type: 'line',
        stack: 'iqr',
        data: lowerBand,
        showSymbol: false,
        lineStyle: { opacity: 0 }
      },
      {
        name: 'Interquartile range',
        type: 'line',
        stack: 'iqr',
        data: iqrHeight,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(59, 130, 246, 0.25)' }
      },
      {
        name: 'Rolling median',
        type: 'line',
        smooth: true,
        data: medianValues,
        symbol: 'none',
        lineStyle: { color: '#1d4ed8', width: 2 }
      }
    ]
  };

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Time lens</h2>
          <p className="section-subtitle">Rolling correlation and distribution changes</p>
        </div>
        <div className="time-controls">
          <select className="select" value={target} onChange={(event) => setTarget(event.target.value)}>
            {dataset.targets.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="select" value={window} onChange={(event) => setWindow(Number(event.target.value))}>
            {ROLLING_WINDOWS.map((item) => (
              <option key={item} value={item}>
                window {item}
              </option>
            ))}
          </select>
          <select className="select" value={order} onChange={(event) => setOrder(event.target.value)}>
            {orderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="section-body two-column">
        <div className="section panel">
          <h3 className="section-title">Correlation vs. {target}</h3>
          <ReactECharts className="chart-square" option={correlationOptions} notMerge lazyUpdate />
        </div>
        <div className="section panel">
          <h3 className="section-title">Trend of {feature.name}</h3>
          <ReactECharts className="chart-square" option={trendOptions} notMerge lazyUpdate />
        </div>
      </div>
    </section>
  );
}
