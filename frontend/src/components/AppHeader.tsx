import type { DatasetSummary } from '../types';

interface AppHeaderProps {
  dataset: DatasetSummary;
  onSampleChange: (direction: 'increase' | 'decrease') => void;
}

export function AppHeader({ dataset, onSampleChange }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="dataset-info">
        <div>
          <h1>{dataset.name}</h1>
          <div className="dataset-meta">
            <span>{dataset.rows.toLocaleString()} rows</span>
            <span>{dataset.columns} columns</span>
            <span>sample: {dataset.sampleSize.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="controls">
        <button className="button secondary" type="button" onClick={() => onSampleChange('decrease')}>
          Decrease sample
        </button>
        <button className="button" type="button" onClick={() => onSampleChange('increase')}>
          Increase sample
        </button>
        <button className="button ghost" type="button">
          Upload dataset
        </button>
      </div>
    </header>
  );
}
