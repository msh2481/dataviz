import ReactECharts from 'echarts-for-react';
import type { FeatureSummary } from '../types';

interface FeatureDetailsProps {
  feature: FeatureSummary | null;
  onClose: () => void;
}

function distributionOptions(feature: FeatureSummary | null) {
  if (!feature) return {};
  return {
    xAxis: { type: 'category', data: feature.sparkline.map((_, idx) => idx) },
    yAxis: { type: 'value' },
    series: [
      {
        data: feature.sparkline,
        type: 'bar',
        itemStyle: { color: '#38bdf8' }
      }
    ]
  };
}

export function FeatureDetails({ feature, onClose }: FeatureDetailsProps) {
  if (!feature) {
    return (
      <div className="section" style={{ minHeight: 200 }}>
        <div className="empty-state">Select a feature to inspect correlations and distribution.</div>
      </div>
    );
  }

  return (
    <div className="section" style={{ minHeight: 200 }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">{feature.name}</h2>
          <p className="section-subtitle">Summary statistics and distribution snapshot</p>
        </div>
        <button className="button secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="section-body">
        <div className="stats">
          <span>Pearson: {feature.pearson?.toFixed(3) ?? '—'}</span>
          <span>Spearman: {feature.spearman?.toFixed(3) ?? '—'}</span>
          <span>Distance: {feature.distance?.toFixed(3) ?? '—'}</span>
          <span>Missing: {(feature.missingRate * 100).toFixed(1)}%</span>
          <span>Mean: {feature.mean?.toFixed(2) ?? '—'}</span>
          <span>Std: {feature.std?.toFixed(2) ?? '—'}</span>
        </div>
        <ReactECharts className="chart-container" option={distributionOptions(feature)} notMerge lazyUpdate />
      </div>
    </div>
  );
}
