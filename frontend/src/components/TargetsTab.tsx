import type { CorrelationRecord, DatasetSummary } from '../types';

interface TargetsTabProps {
  dataset: DatasetSummary;
  correlations: CorrelationRecord[];
  activeTarget: string;
  onTargetChange: (target: string) => void;
}

export function TargetsTab({ dataset, correlations, activeTarget, onTargetChange }: TargetsTabProps) {
  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Target signals</h2>
          <p className="section-subtitle">Explore Pearson, Spearman and Distance correlations</p>
        </div>
        <select className="select" value={activeTarget} onChange={(event) => onTargetChange(event.target.value)}>
          {dataset.targets.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </div>
      <div className="section-body">
        <table className="target-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Pearson</th>
              <th>Spearman</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>
            {correlations.map((record) => (
              <tr key={record.feature}>
                <td>{record.feature}</td>
                <td>{record.pearson.toFixed(3)}</td>
                <td>{record.spearman.toFixed(3)}</td>
                <td>{record.distance.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
