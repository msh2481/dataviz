import { useMemo, useState } from 'react';
import classNames from 'classnames';
import type { FeatureSummary } from '../types';

interface FeatureCatalogProps {
  features: FeatureSummary[];
  activeFeatureId?: string;
  onSelect: (feature: FeatureSummary) => void;
}

export function FeatureCatalog({ features, activeFeatureId, onSelect }: FeatureCatalogProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'pearson' | 'missing'>('name');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = normalized
      ? features.filter((feature) => feature.name.toLowerCase().includes(normalized))
      : features;

    return items.slice().sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'pearson') return Math.abs(b.pearson ?? 0) - Math.abs(a.pearson ?? 0);
      if (sortKey === 'missing') return (b.missingRate ?? 0) - (a.missingRate ?? 0);
      return 0;
    });
  }, [features, query, sortKey]);

  return (
    <aside className="left-rail">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search features"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="small-text">Sort by</div>
      <div className="compare-config">
        <select className="select" value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)}>
          <option value="name">Name</option>
          <option value="pearson">|Pearson|</option>
          <option value="missing">Missing %</option>
        </select>
      </div>
      <div className="feature-list">
        {filtered.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className={classNames('feature-item', { active: feature.id === activeFeatureId })}
            onClick={() => onSelect(feature)}
          >
            <div className="name">{feature.name}</div>
            <div className="meta">
              <span>{feature.type}</span>
              <span>{Math.round((feature.missingRate ?? 0) * 100)}% missing</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
