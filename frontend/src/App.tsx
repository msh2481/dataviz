import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { CompareTab } from './components/CompareTab';
import { FeatureCatalog } from './components/FeatureCatalog';
import { FeatureDetails } from './components/FeatureDetails';
import { OverviewTab } from './components/OverviewTab';
import { TargetsTab } from './components/TargetsTab';
import { TimeLensTab } from './components/TimeLensTab';
import { useDataset } from './hooks/useDataset';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'compare', label: 'Compare' },
  { id: 'targets', label: 'Targets' },
  { id: 'timeline', label: 'Time lens' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const {
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
  } = useDataset();
  const [activeTarget, setActiveTarget] = useState<string>('');

  useEffect(() => {
    if (summary && summary.targets.length && !activeTarget) {
      setActiveTarget(summary.targets[0]);
    }
  }, [summary, activeTarget]);

  const correlations = useMemo(
    () =>
      summary?.features.map((feature) => ({
        feature: feature.name,
        pearson: feature.pearson ?? 0,
        spearman: feature.spearman ?? 0,
        distance: feature.distance ?? 0
      })) ?? [],
    [summary]
  );

  if (isLoading) {
    return <div className="empty-state">Loading dataset…</div>;
  }

  if (!summary || error) {
    return <div className="empty-state">{error ?? 'No dataset loaded yet.'}</div>;
  }

  const renderTab = (id: TabId) => {
    switch (id) {
      case 'overview':
        return <OverviewTab features={summary.features.slice(0, 9)} />;
      case 'compare':
        return (
          <CompareTab
            features={summary.features}
            config={compareConfig}
            series={compareSeries}
            onConfigChange={refreshCompare}
          />
        );
      case 'targets':
        return (
          <TargetsTab
            dataset={summary}
            correlations={correlations}
            activeTarget={activeTarget || summary.targets[0]}
            onTargetChange={(value) => setActiveTarget(value)}
          />
        );
      case 'timeline':
        return (
          <TimeLensTab
            dataset={summary}
            feature={activeFeature}
            data={timeLens}
            orderField={timeOrder}
            onRequest={loadTimeLens}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <AppHeader dataset={summary} onSampleChange={adjustSample} />
      <FeatureCatalog
        features={summary.features}
        activeFeatureId={activeFeature?.id}
        onSelect={(feature) => setActiveFeature(feature)}
      />
      <main className="main-content">
        <div className="tab-bar">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {renderTab(tab)}
        <FeatureDetails feature={activeFeature} onClose={() => setActiveFeature(null)} />
      </main>
    </div>
  );
}
