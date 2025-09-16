import { useMemo, useState } from 'react';
import classNames from 'classnames';
import type { FeatureSummary } from '../types';

interface FeatureCatalogProps {
  features: FeatureSummary[];
  activeFeatureId?: string;
  onSelect: (feature: FeatureSummary) => void;
}

type SortKey = 'name' | 'pearson' | 'spearman';

export function FeatureCatalog({ features, activeFeatureId, onSelect }: FeatureCatalogProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = normalized
      ? features.filter((feature) => feature.name.toLowerCase().includes(normalized))
      : features;

    return items.slice().sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'pearson') return Math.abs(b.pearson ?? 0) - Math.abs(a.pearson ?? 0);
      return Math.abs(b.spearman ?? 0) - Math.abs(a.spearman ?? 0);
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
        <select className="select" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
          <option value="name">Name</option>
          <option value="pearson">|Pearson|</option>
          <option value="spearman">|Spearman|</option>
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
              <span>
                ρ {feature.spearman !== undefined ? feature.spearman.toFixed(2) : '—'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
