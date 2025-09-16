import ReactECharts from 'echarts-for-react';
import type { CorrelationRecord, FeatureSummary } from '../types';

interface OverviewTabProps {
  features: FeatureSummary[];
  correlations: CorrelationRecord[];
}

function sparklineOptions(values: number[]) {
  return {
    xAxis: {
      type: 'category',
      show: false,
      data: values.map((_, idx) => idx)
    },
    yAxis: {
      type: 'value',
      show: false
    },
    series: [
      {
        data: values,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#2563eb',
          width: 2
        },
        areaStyle: {
          color: 'rgba(37, 99, 235, 0.12)'
        }
      }
    ],
    grid: {
      top: 8,
      bottom: 0,
      left: 0,
      right: 0
    }
  };
}

function correlationHeatmapOptions(records: CorrelationRecord[]) {
  const data = records.slice(0, 10);
  return {
    tooltip: {
      formatter: ({ value }: any) => `${value[0]}<br/>${value[1]}: ${value[2].toFixed(2)}`
    },
    xAxis: {
      type: 'category',
      data: ['Pearson', 'Spearman', 'Distance']
    },
    yAxis: {
      type: 'category',
      data: data.map((record) => record.feature)
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#ef4444', '#fef3c7', '#22c55e']
      }
    },
    series: [
      {
        name: 'Correlation',
        type: 'heatmap',
        data: data.flatMap((record) => [
          ['Pearson', record.feature, record.pearson],
          ['Spearman', record.feature, record.spearman],
          ['Distance', record.feature, record.distance]
        ]),
        label: {
          show: false
        }
      }
    ]
  };
}

export function OverviewTab({ features, correlations }: OverviewTabProps) {
  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Feature overview</h2>
          <p className="section-subtitle">Sparkline of sampled distributions with key stats</p>
        </div>
      </div>
      <div className="section-body">
        <div className="feature-grid">
          {features.map((feature) => (
            <div className="feature-card" key={feature.id}>
              <div className="section-header">
                <h3>{feature.name}</h3>
                <span className="badge">{feature.type}</span>
              </div>
              <ReactECharts className="chart-container" option={sparklineOptions(feature.sparkline)} notMerge lazyUpdate />
              <div className="stats">
                <span>Missing: {(feature.missingRate * 100).toFixed(1)}%</span>
                <span>Std: {feature.std?.toFixed(2) ?? '—'}</span>
                <span>Mean: {feature.mean?.toFixed(2) ?? '—'}</span>
                <span>Median: {feature.median?.toFixed(2) ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="divider" />
      <div className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Top correlations</h2>
            <p className="section-subtitle">Pearson, Spearman and Distance metrics</p>
          </div>
        </div>
        <ReactECharts className="chart-container" option={correlationHeatmapOptions(correlations)} notMerge lazyUpdate />
      </div>
    </div>
  );
}
