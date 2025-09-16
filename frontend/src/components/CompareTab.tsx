import React, { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { CompareConfig, FeatureSummary } from '../types';

interface CompareTabProps {
  features: FeatureSummary[];
  config: CompareConfig;
  series: Array<{ name: string; data: Array<[number, number]> }>;
  onConfigChange: (config: CompareConfig) => void;
}

function buildOptions(config: CompareConfig, series: CompareTabProps['series']) {
  if (!series.length) {
    return {
      title: { text: 'Choose at least one feature to populate the chart' }
    };
  }

  if (config.chartType === 'scatter') {
    return {
      tooltip: {
        trigger: 'item'
      },
      xAxis: {
        name: config.x ?? '',
        type: 'value'
      },
      yAxis: {
        name: config.y ?? '',
        type: 'value'
      },
      series: series.map((serie) => ({
        ...serie,
        type: 'scatter',
        symbolSize: 6,
        emphasis: { focus: 'series' }
      }))
    };
  }

  if (config.chartType === 'distribution') {
    return {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category'
      },
      yAxis: {
        type: 'value'
      },
      series: series.map((serie) => ({
        ...serie,
        type: 'line',
        smooth: true
      }))
    };
  }

  return {};
}

export function CompareTab({ features, config, series, onConfigChange }: CompareTabProps) {
  useEffect(() => {
    if (!config.x && features.length) {
      onConfigChange({ ...config, x: features[0].id });
    }
  }, [config, features, onConfigChange]);

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Compare features</h2>
          <p className="section-subtitle">Switch between scatter and distribution views</p>
        </div>
      </div>
      <div className="compare-config">
        <select
          className="select"
          value={config.chartType}
          onChange={(event) => onConfigChange({ ...config, chartType: event.target.value as typeof config.chartType })}
        >
          <option value="scatter">Scatter</option>
          <option value="distribution">Distribution</option>
        </select>
        <select className="select" value={config.x ?? ''} onChange={(event) => onConfigChange({ ...config, x: event.target.value })}>
          <option value="" disabled>
            X axis
          </option>
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.name}
            </option>
          ))}
        </select>
        {config.chartType === 'scatter' ? (
          <select
            className="select"
            value={config.y ?? ''}
            onChange={(event) => onConfigChange({ ...config, y: event.target.value })}
          >
            <option value="" disabled>
              Y axis
            </option>
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="select"
          value={config.color ?? ''}
          onChange={(event) => onConfigChange({ ...config, color: event.target.value })}
        >
          <option value="">Color by (optional)</option>
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.name}
            </option>
          ))}
        </select>
      </div>
      <ReactECharts className="chart-container" option={buildOptions(config, series)} notMerge lazyUpdate />
    </div>
  );
}
