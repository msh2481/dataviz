import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { DatasetSummary, FeatureSummary } from '../types';
import type { TimeLensResponse } from '../services/dataService';

interface TimeLensTabProps {
  dataset: DatasetSummary;
  feature: FeatureSummary | null;
  data: TimeLensResponse | null;
  onRequest: (featureId: string, target: string, window: number) => void;
}

const ROLLING_WINDOWS = [7, 14, 30, 60];

export function TimeLensTab({ dataset, feature, data, onRequest }: TimeLensTabProps) {
  const [target, setTarget] = useState(() => dataset.targets[0]);
  const [window, setWindow] = useState(ROLLING_WINDOWS[1]);

  useEffect(() => {
    if (feature) {
      onRequest(feature.id, target, window);
    }
  }, [feature, target, window, onRequest]);

  if (!feature) {
    return <div className="empty-state">Select a feature from the catalog to inspect temporal behavior.</div>;
  }

  const correlationOptions = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: data?.correlation.values.map((point) => point.timestamp) ?? []
    },
    yAxis: {
      type: 'value',
      min: -1,
      max: 1
    },
    series: [
      {
        name: 'Rolling correlation',
        type: 'line',
        smooth: true,
        data: data?.correlation.values.map((point) => point.value) ?? [],
        areaStyle: {
          color: 'rgba(99, 102, 241, 0.15)'
        }
      }
    ]
  };

  const trendOptions = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: data?.featureTrend.map((point) => point.timestamp) ?? []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: feature.name,
        type: 'line',
        smooth: true,
        data: data?.featureTrend.map((point) => point.value) ?? []
      }
    ]
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Time lens</h2>
          <p className="section-subtitle">Rolling correlation and feature trend</p>
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
                rolling {item} days
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="section-body">
        <div className="section" style={{ minHeight: 260 }}>
          <h3 className="section-title">Correlation vs. {target}</h3>
          <ReactECharts className="chart-container" option={correlationOptions} notMerge lazyUpdate />
        </div>
        <div className="section" style={{ minHeight: 260 }}>
          <h3 className="section-title">Trend of {feature.name}</h3>
          <ReactECharts className="chart-container" option={trendOptions} notMerge lazyUpdate />
        </div>
      </div>
    </div>
  );
}
