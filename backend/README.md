# EDA Copilot Backend

FastAPI application that serves the data exploration API used by the frontend. It keeps a dataframe in-memory and exposes lightweight endpoints for summaries, comparisons, and time-based analysis.

## Quick start

```bash
cd backend
uvicorn app.main:app --reload
```

Upload a dataset (CSV or Parquet) via `POST /dataset/load` using a multipart form. The server stores the dataframe in memory and subsequent requests operate on the current selection.

## API surface

- `POST /dataset/load` — upload a CSV/Parquet file and initialise the workspace. Returns `DatasetSummary` with feature statistics.
- `GET /dataset/summary` — retrieve the current dataset summary (sample size, feature catalog, candidate targets).
- `POST /dataset/sample` — change the working sample by absolute `sampleSize` or relative `delta`.
- `GET /dataset/{target}/correlations` — compute Pearson/Spearman/Distance correlations between the target and numeric features.
- `POST /compare` — generate scatter/distribution series for a selected feature pair.
- `POST /time-lens` — compute rolling correlation plus median/IQR trends for a feature ordered by an optional column.
- `GET /health` — simple heartbeat endpoint.

## Implementation notes

- Pandas powers dataframe operations; heavier calculations (distance correlation, rolling stats) rely on NumPy/SciPy.
- Sampling keeps responsiveness high: endpoints operate on a deterministic sample (`random_state=42`) capped at the requested size.
- Distance correlation uses the `dcor` implementation for robustness across environments.
- All responses match the frontend TypeScript contracts so integration only requires swapping the mock service calls for `fetch`/`react-query` requests.
