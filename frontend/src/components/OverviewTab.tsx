import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { FeatureSummary } from '../types';

interface OverviewTabProps {
  features: FeatureSummary[];
}

function sparklineOptions(values: number[]): EChartsOption {
  return {
    grid: { top: 10, bottom: 10, left: 10, right: 10 },
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
          width: 2.5
        },
        areaStyle: {
          color: 'rgba(37, 99, 235, 0.14)'
        }
      }
    ]
  } as EChartsOption;
}

export function OverviewTab({ features }: OverviewTabProps) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Feature overview</h2>
          <p className="section-subtitle">Quick glance at trend and strength of association</p>
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
              <ReactECharts className="chart-card" option={sparklineOptions(feature.sparkline)} notMerge lazyUpdate />
              <div className="stats">
                <span>Pearson: {feature.pearson?.toFixed(2) ?? '—'}</span>
                <span>Spearman: {feature.spearman?.toFixed(2) ?? '—'}</span>
                <span>Distance: {feature.distance?.toFixed(2) ?? '—'}</span>
                <span>Std: {feature.std?.toFixed(2) ?? '—'}</span>
                <span>Median: {feature.median?.toFixed(2) ?? '—'}</span>
                <span>Range: {feature.min?.toFixed(2) ?? '—'} – {feature.max?.toFixed(2) ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
