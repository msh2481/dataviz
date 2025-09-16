import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import ReactECharts from 'echarts-for-react';
import type { FeatureSummary, HistogramBin } from '../types';

interface FeatureDetailsProps {
  feature: FeatureSummary | null;
  onClose: () => void;
}

const CHART_STYLE: CSSProperties = { height: '60vh', width: '100%' } as const;
const DEFAULT_BIN_COUNT = 24;
const BIN_OPTIONS = [12, 24, 36, 48];

interface AggregatedBin extends HistogramBin {
  startIndex: number;
  endIndex: number;
}

const formatStat = (value?: number | null) => (value === undefined || value === null ? '—' : value.toFixed(3));

function clampRange(length: number, range: { start: number; end: number } | null) {
  if (!range || !length) {
    return { start: 0, end: Math.max(length - 1, 0) };
  }
  const start = Math.max(0, Math.min(range.start, length - 1));
  const end = Math.max(start, Math.min(range.end, length - 1));
  return { start, end };
}

function rebinHistogram(bins: HistogramBin[], binsCount: number, offset: number): AggregatedBin[] {
  if (!bins.length) return [];
  const target = Math.min(binsCount, Math.max(bins.length, 1));
  const result: AggregatedBin[] = [];
  let previousEnd = 0;

  for (let bucket = 0; bucket < target; bucket += 1) {
    const startIdx = previousEnd;
    let endIdxExclusive = bucket === target - 1 ? bins.length : Math.round(((bucket + 1) * bins.length) / target);
    if (endIdxExclusive <= startIdx) {
      endIdxExclusive = startIdx + 1;
    }
    previousEnd = endIdxExclusive;

    const slice = bins.slice(startIdx, endIdxExclusive);
    const value = slice.reduce((acc, item) => acc + item.value, 0);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const label = first.label === last.label ? first.label : `${first.label}–${last.label}`;

    result.push({
      label,
      value: Math.round(value),
      startIndex: offset + startIdx,
      endIndex: offset + endIdxExclusive - 1
    });
  }

  return result;
}

export function FeatureDetails({ feature, onClose }: FeatureDetailsProps) {
  const [binCount, setBinCount] = useState(DEFAULT_BIN_COUNT);
  const [viewRange, setViewRange] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    setBinCount(DEFAULT_BIN_COUNT);
    setViewRange(null);
  }, [feature?.id]);

  const originalBins = useMemo(() => feature?.distribution ?? [], [feature?.distribution]);

  const aggregatedBins = useMemo(() => {
    if (!feature) return [] as AggregatedBin[];
    const { start, end } = clampRange(originalBins.length, viewRange);
    const subset = originalBins.slice(start, end + 1);
    return rebinHistogram(subset, binCount, start);
  }, [feature, originalBins, viewRange, binCount]);

  const statsRows = useMemo(() => {
    if (!feature) return [] as Array<{ label: string; value: string }>;
    return [
      { label: 'Pearson', value: formatStat(feature.pearson) },
      { label: 'Spearman', value: formatStat(feature.spearman) },
      { label: 'Distance', value: formatStat(feature.distance) },
      { label: 'Mean', value: formatStat(feature.mean) },
      { label: 'Std', value: formatStat(feature.std) },
      { label: 'Min', value: formatStat(feature.min) },
      { label: 'Max', value: formatStat(feature.max) },
      { label: 'Q05', value: formatStat(feature.quantiles?.q05) },
      { label: 'Q25', value: formatStat(feature.quantiles?.q25) },
      { label: 'Median', value: formatStat(feature.quantiles?.q50 ?? feature.median) },
      { label: 'Q75', value: formatStat(feature.quantiles?.q75) },
      { label: 'Q95', value: formatStat(feature.quantiles?.q95) }
    ];
  }, [feature]);

  const histogramOptions = useMemo(
    () => ({
      grid: { top: 20, bottom: 40, left: 40, right: 10 },
      dataZoom: [
        { type: 'inside' as const },
        { type: 'slider' as const, height: 16, bottom: 8 }
      ],
      tooltip: { trigger: 'item' as const },
      xAxis: {
        type: 'category' as const,
        data: aggregatedBins.map((bin) => bin.label),
        axisLabel: { rotate: 45 }
      },
      yAxis: { type: 'value' as const },
      series: [
        {
          name: 'Frequency',
          type: 'bar' as const,
          data: aggregatedBins.map((bin) => bin.value),
          itemStyle: { color: '#2563eb', opacity: 0.85 }
        }
      ]
    }),
    [aggregatedBins]
  );

  const handleDataZoom = useCallback(
    (event: any) => {
      if (!aggregatedBins.length) return;
      const payload = event.batch?.[0] ?? event;
      const { startValue, endValue } = payload ?? {};
      if (startValue === undefined || endValue === undefined) return;

      const startIndex = typeof startValue === 'number'
        ? startValue
        : aggregatedBins.findIndex((bin) => bin.label === startValue);
      const endIndex = typeof endValue === 'number'
        ? endValue
        : aggregatedBins.findIndex((bin) => bin.label === endValue);

      if (startIndex < 0 || endIndex < 0) return;

      const lower = Math.min(startIndex, endIndex);
      const upper = Math.max(startIndex, endIndex);
      const nextRange = {
        start: aggregatedBins[lower].startIndex,
        end: aggregatedBins[upper].endIndex
      };

      setViewRange((prev) => {
        if (prev && prev.start === nextRange.start && prev.end === nextRange.end) {
          return prev;
        }
        return nextRange;
      });
    },
    [aggregatedBins]
  );

  const resetView = useCallback(() => setViewRange(null), []);

  if (!feature) {
    return (
      <section className="section" style={{ minHeight: 200 }}>
        <div className="empty-state">Select a feature to inspect correlations and distribution.</div>
      </section>
    );
  }

  return (
    <section className="section" style={{ minHeight: 300 }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">{feature.name}</h2>
          <p className="section-subtitle">Correlations, quantiles and responsive histogram</p>
        </div>
        <div className="detail-controls">
          <button className="button ghost" type="button" onClick={resetView}>
            Reset range
          </button>
          <select
            className="select"
            value={binCount}
            onChange={(event) => setBinCount(Number(event.target.value))}
            aria-label="Select number of bins"
          >
            {BIN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} bins
              </option>
            ))}
          </select>
          <button className="button secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
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
          <div className="chart-shell">
            <ReactECharts
              key={feature.id}
              className="chart-square"
              style={CHART_STYLE}
              option={histogramOptions}
              notMerge
              lazyUpdate
              onEvents={{ datazoom: handleDataZoom }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
