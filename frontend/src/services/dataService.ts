import type {
  CompareConfig,
  CompareSeriesResponse,
  CorrelationRecord,
  DatasetSummary,
  OverviewData,
  TimeLensResponse
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers ?? {});

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      if (typeof data === 'object' && data && 'detail' in data) {
        message = String((data as { detail?: unknown }).detail ?? message);
      }
    } catch (error) {
      // ignore body parse errors and fall back to status text
    }
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchOverview(): Promise<OverviewData> {
  const dataset = await request<DatasetSummary>('/dataset/summary');

  const correlations: CorrelationRecord[] = dataset.features.map((feature) => ({
    feature: feature.name,
    pearson: feature.pearson ?? 0,
    spearman: feature.spearman ?? 0,
    distance: feature.distance ?? 0
  }));

  return { dataset, correlations };
}

export function fetchCompare(config: CompareConfig): Promise<CompareSeriesResponse> {
  return request<CompareSeriesResponse>('/compare', {
    method: 'POST',
    body: JSON.stringify({ config })
  });
}

export function fetchTimeLens(
  feature: string,
  target: string,
  window: number,
  orderField: string | null
): Promise<TimeLensResponse> {
  return request<TimeLensResponse>('/time-lens', {
    method: 'POST',
    body: JSON.stringify({ feature, target, window, orderField })
  });
}

export function changeSampleSize(delta: number): Promise<DatasetSummary> {
  return request<DatasetSummary>('/dataset/sample', {
    method: 'POST',
    body: JSON.stringify({ delta })
  });
}

