from __future__ import annotations

import io
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from . import stats


@dataclass
class DatasetMetadata:
    name: str
    rows: int
    columns: int


class DatasetNotLoadedError(RuntimeError):
    pass


class DatasetManager:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._df: Optional[pd.DataFrame] = None
        self._sample_size: Optional[int] = None
        self._name: Optional[str] = None

    @property
    def dataframe(self) -> pd.DataFrame:
        if self._df is None:
            raise DatasetNotLoadedError("Dataset has not been loaded")
        return self._df

    @property
    def metadata(self) -> DatasetMetadata:
        df = self.dataframe
        return DatasetMetadata(
            name=self._name or "dataset",
            rows=len(df),
            columns=df.shape[1],
        )

    @property
    def is_loaded(self) -> bool:
        return self._df is not None

    def load_file(self, file_bytes: bytes, filename: str) -> DatasetMetadata:
        buffer = io.BytesIO(file_bytes)
        suffix = Path(filename).suffix.lower()
        if suffix in {".parquet", ".pq"}:
            df = pd.read_parquet(buffer)
        elif suffix in {".csv", ".txt"}:
            df = pd.read_csv(buffer)
        else:
            raise ValueError(f"Unsupported file extension: {suffix or '?'}")

        with self._lock:
            self._df = df
            self._name = filename
            self._sample_size = min(5_000, len(df))
        return self.metadata

    def load_dataframe(self, df: pd.DataFrame, name: str = "dataset") -> DatasetMetadata:
        with self._lock:
            self._df = df.copy()
            self._name = name
            self._sample_size = min(5_000, len(df))
        return self.metadata

    def ensure_loaded(self) -> None:
        if self._df is None:
            raise DatasetNotLoadedError("No dataset loaded")

    def set_sample_size(self, target_size: int) -> DatasetMetadata:
        self.ensure_loaded()
        with self._lock:
            self._sample_size = max(500, min(len(self._df), target_size))
        return self.metadata

    def adjust_sample(self, delta: int) -> DatasetMetadata:
        self.ensure_loaded()
        with self._lock:
            current = self._sample_size or min(5_000, len(self._df))
            self._sample_size = max(500, min(len(self._df), current + delta))
        return self.metadata

    def get_sample(self) -> pd.DataFrame:
        df = self.dataframe
        sample_size = self._sample_size or min(5_000, len(df))
        if sample_size >= len(df):
            return df.copy()
        return df.sample(n=sample_size, random_state=42)

    def feature_summaries(self, target: Optional[str] = None, df: Optional[pd.DataFrame] = None) -> list[dict]:
        if df is None:
            df = self.get_sample()
        summaries: list[dict] = []
        target_series = df[target] if target and target in df.columns else None

        for column in df.columns:
            if column == target:
                continue
            series = df[column]
            feature_type = stats.detect_feature_type(series)
            quantiles = stats.compute_quantiles(series)
            histogram = stats.compute_histogram(series, bins=24)
            summary = {
                "id": column,
                "name": column,
                "type": feature_type,
                "cardinality": stats.cardinality(series) if feature_type != "numeric" else None,
                "mean": stats.safe_mean(series),
                "median": stats.safe_median(series),
                "std": stats.safe_std(series),
                "min": stats.safe_min(series),
                "max": stats.safe_max(series),
                "pearson": None,
                "spearman": None,
                "distance": None,
                "quantiles": quantiles,
                "sparkline": stats.compute_sparkline(series),
                "distribution": histogram,
            }

            if target_series is not None and feature_type == "numeric":
                summary["pearson"] = stats.pearson_corr(series, target_series)
                summary["spearman"] = stats.spearman_corr(series, target_series)
                summary["distance"] = stats.distance_correlation(series, target_series)
            elif target_series is not None and feature_type == "categorical":
                # correlation measures for categorical target/feature left as None for now
                pass

            summaries.append(summary)
        return summaries

    def dataset_summary(self) -> dict:
        meta = self.metadata
        df = self.get_sample()
        targets = self._infer_target_candidates(df)
        primary_target = targets[0] if targets else None
        return {
            "name": meta.name,
            "rows": meta.rows,
            "columns": meta.columns,
            "sampleSize": len(df),
            "lastUpdated": pd.Timestamp.utcnow().isoformat(),
            "targets": targets,
            "features": self.feature_summaries(primary_target, df),
        }

    def correlations_for_target(self, target: str) -> list[dict]:
        df = self.get_sample()
        if target not in df.columns:
            raise ValueError(f"Target '{target}' not found")
        target_series = df[target]
        correlations: list[dict] = []
        for column in df.columns:
            if column == target:
                continue
            feature_series = df[column]
            if stats.detect_feature_type(feature_series) != "numeric":
                continue
            correlations.append(
                {
                    "feature": column,
                    "pearson": stats.pearson_corr(feature_series, target_series) or 0.0,
                    "spearman": stats.spearman_corr(feature_series, target_series) or 0.0,
                    "distance": stats.distance_correlation(feature_series, target_series) or 0.0,
                }
            )
        return correlations

    def compare_series(self, x: str, y: Optional[str], chart_type: str) -> list[dict]:
        df = self.get_sample()
        if x not in df.columns:
            raise ValueError(f"Feature '{x}' not found")
        series_x = df[x]
        if chart_type == "distribution":
            histogram = stats.compute_histogram(series_x, bins=50)
            return [
                {
                    "name": x,
                    "data": [[idx, bin_["value"]] for idx, bin_ in enumerate(histogram)],
                }
            ]

        if chart_type == "scatter":
            if not y or y not in df.columns:
                raise ValueError("Scatter comparison requires a y feature")
            series_y = df[y]
            aligned_x, aligned_y = stats.align_non_null(series_x, series_y)
            return [
                {
                    "name": f"{x} vs {y}",
                    "data": list(map(lambda pair: [float(pair[0]), float(pair[1])], zip(aligned_x, aligned_y))),
                }
            ]

        raise ValueError(f"Unsupported chart type: {chart_type}")

    def time_lens(self, feature: str, target: str, window: int, order_field: Optional[str]) -> dict:
        df = self.get_sample()
        if feature not in df.columns or target not in df.columns:
            raise ValueError("Feature or target not found")

        order_series = df[order_field] if order_field and order_field in df.columns else pd.Series(np.arange(len(df)))
        order_series = stats.sanitize_numeric(order_series)
        time_sorted = df.assign(__order=order_series).sort_values("__order")

        rolling_corr = stats.rolling_correlation(time_sorted[target], time_sorted[feature], window)
        quantiles = stats.rolling_quantiles(time_sorted[feature], window)

        corr_values = [
            {"key": str(idx), "value": float(value)}
            for idx, value in rolling_corr.reset_index(drop=True).items()
            if not pd.isna(value)
        ]

        trend_values = []
        for idx, row in quantiles.reset_index(drop=True).iterrows():
            if pd.isna(row["median"]):
                continue
            trend_values.append(
                {
                    "key": str(idx),
                    "median": float(row["median"]),
                    "q25": float(row["q25"]),
                    "q75": float(row["q75"]),
                }
            )

        return {
            "correlation": {
                "feature": feature,
                "target": target,
                "window": window,
                "orderField": order_field,
                "values": corr_values,
            },
            "featureTrend": trend_values,
        }

    def _infer_target_candidates(self, df: pd.DataFrame) -> list[str]:
        numeric_cols = [col for col in df.columns if stats.detect_feature_type(df[col]) == "numeric"]
        # heuristics: prefer columns with "target" or "y" in name
        ranked = sorted(
            numeric_cols,
            key=lambda col: (
                -1 if "target" in col.lower() or col.lower().endswith("y") else 0,
                -df[col].nunique(dropna=True),
            ),
        )
        return ranked[: min(4, len(ranked))]
