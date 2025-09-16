import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { FeatureSummary, HistogramBin } from '../types';

interface FeatureDetailsProps {
  feature: FeatureSummary | null;
  onClose: () => void;
}

const HISTOGRAM_TARGET_BINS = 24;
const DEFAULT_FORMAT = (value?: number | null) => (value === undefined || value === null ? '—' : value.toFixed(3));

function aggregateBins(bins: HistogramBin[], targetSize: number) {
  if (!bins.length) return [] as HistogramBin[];
  if (bins.length <= targetSize) return bins;
  const chunkSize = bins.length / targetSize;
  const aggregated: HistogramBin[] = [];

  for (let bucket = 0; bucket < targetSize; bucket += 1) {
    const start = Math.floor(bucket * chunkSize);
    const end = Math.min(bins.length, Math.floor((bucket + 1) * chunkSize));
    const slice = bins.slice(start, Math.max(start + 1, end));
    const total = slice.reduce((acc, item) => acc + item.value, 0);
    const label = slice.length === 1 ? slice[0].label : `${slice[0].label}–${slice[slice.length - 1].label}`;
    aggregated.push({ label, value: Math.round(total) });
  }

  return aggregated;
}

export function FeatureDetails({ feature, onClose }: FeatureDetailsProps) {
  const [histogram, setHistogram] = useState<HistogramBin[]>(feature?.distribution ?? []);
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);
  const originalBins = useMemo(() => feature?.distribution ?? [], [feature?.id]);

  useEffect(() => {
    setHistogram(feature?.distribution ?? []);
    setZoomRange(null);
  }, [feature?.id]);

  const statsRows = useMemo(() => {
    if (!feature) return [] as Array<{ label: string; value: string }>;
    return [
      { label: 'Pearson', value: DEFAULT_FORMAT(feature.pearson) },
      { label: 'Spearman', value: DEFAULT_FORMAT(feature.spearman) },
      { label: 'Distance', value: DEFAULT_FORMAT(feature.distance) },
      { label: 'Mean', value: DEFAULT_FORMAT(feature.mean) },
      { label: 'Std', value: DEFAULT_FORMAT(feature.std) },
      { label: 'Min', value: DEFAULT_FORMAT(feature.min) },
      { label: 'Max', value: DEFAULT_FORMAT(feature.max) },
      { label: 'Q05', value: DEFAULT_FORMAT(feature.quantiles?.q05) },
      { label: 'Q25', value: DEFAULT_FORMAT(feature.quantiles?.q25) },
      { label: 'Median', value: DEFAULT_FORMAT(feature.quantiles?.q50 ?? feature.median) },
      { label: 'Q75', value: DEFAULT_FORMAT(feature.quantiles?.q75) },
      { label: 'Q95', value: DEFAULT_FORMAT(feature.quantiles?.q95) }
    ];
  }, [feature]);

  const histogramOptions = useMemo(() => ({
    grid: { top: 20, bottom: 40, left: 40, right: 10 },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 16, bottom: 8 }
    ],
    tooltip: { trigger: 'item' },
    xAxis: {
      type: 'category',
      data: histogram.map((bin) => bin.label),
      axisLabel: { rotate: 45 }
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Frequency',
        type: 'bar',
        data: histogram.map((bin) => bin.value),
        itemStyle: { color: '#2563eb', opacity: 0.85 }
      }
    ]
  }), [histogram]);

  const handleDataZoom = useCallback(
    (event: any) => {
      if (!feature) return;
      const payload = event.batch?.[0] ?? event;
      const start = payload.startValue ?? 0;
      const end = payload.endValue ?? originalBins.length - 1;
      if (zoomRange && zoomRange.start === start && zoomRange.end === end) return;
      setZoomRange({ start, end });
      if (start === 0 && end >= originalBins.length - 1) {
        setHistogram(originalBins);
        return;
      }
      const rebinned = aggregateBins(originalBins.slice(start, end + 1), HISTOGRAM_TARGET_BINS);
      setHistogram(rebinned.length ? rebinned : originalBins);
    },
    [feature, originalBins, zoomRange]
  );

  if (!feature) {
    return (
      <section className="section" style={{ minHeight: 200 }}>
        <div className="empty-state">Select a feature to inspect correlations and distribution.</div>
      </section>
    );
  }

  return (
    <section className="section" style={{ minHeight: 280 }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">{feature.name}</h2>
          <p className="section-subtitle">Correlations, quantiles and responsive histogram</p>
        </div>
        <button className="button secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="section-body detail-layout">
        <div className="stats-table">
          <table>
            <tbody>
              {statsRows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="histogram-panel">
          <ReactECharts
            className="chart-square"
            option={histogramOptions}
            notMerge
            lazyUpdate
            onEvents={{ datazoom: handleDataZoom }}
          />
        </div>
      </div>
    </section>
  );
}
