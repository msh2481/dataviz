from __future__ import annotations

from typing import Iterable, Literal

import dcor
import numpy as np
import pandas as pd

FeatureType = Literal["numeric", "categorical", "datetime"]


def detect_feature_type(series: pd.Series) -> FeatureType:
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    return "categorical"


def sanitize_numeric(series: pd.Series) -> pd.Series:
    if pd.api.types.is_numeric_dtype(series):
        return series.astype(float)
    if pd.api.types.is_datetime64_any_dtype(series):
        return series.view("int64").astype(float)
    return pd.to_numeric(series, errors="coerce")


def compute_quantiles(series: pd.Series) -> dict[str, float] | None:
    if not pd.api.types.is_numeric_dtype(series):
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    quantiles = clean.quantile([0.05, 0.25, 0.5, 0.75, 0.95])
    return {
        "q05": float(quantiles.iloc[0]),
        "q25": float(quantiles.iloc[1]),
        "q50": float(quantiles.iloc[2]),
        "q75": float(quantiles.iloc[3]),
        "q95": float(quantiles.iloc[4]),
    }


def compute_histogram(series: pd.Series, bins: int = 24) -> list[dict[str, float]]:
    clean = series.dropna()
    if clean.empty:
        return []

    if pd.api.types.is_numeric_dtype(clean):
        counts, edges = np.histogram(clean, bins=bins)
        histogram = []
        for idx, count in enumerate(counts):
            start = edges[idx]
            end = edges[idx + 1]
            label = f"{start:.2f}–{end:.2f}"
            histogram.append({"label": label, "value": int(count)})
        return histogram

    # categorical histogram
    value_counts = clean.astype(str).value_counts().head(bins)
    return [{"label": str(index), "value": int(count)} for index, count in value_counts.items()]


def compute_sparkline(series: pd.Series, points: int = 50) -> list[float]:
    if series.empty:
        return []

    if pd.api.types.is_numeric_dtype(series):
        clean = series.dropna()
        if clean.empty:
            return []
        quantiles = np.linspace(0.0, 1.0, num=points)
        sampled = clean.quantile(quantiles, interpolation="linear")
        return sampled.astype(float).tolist()

    counts = series.astype(str).value_counts(normalize=True).sort_index()
    return counts.values.tolist()[:points]


def safe_mean(series: pd.Series) -> float | None:
    if not pd.api.types.is_numeric_dtype(series):
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.mean())


def safe_std(series: pd.Series) -> float | None:
    if not pd.api.types.is_numeric_dtype(series):
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.std())


def safe_min(series: pd.Series) -> float | None:
    if not pd.api.types.is_numeric_dtype(series):
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.min())


def safe_max(series: pd.Series) -> float | None:
    if not pd.api.types.is_numeric_dtype(series):
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.max())


def safe_median(series: pd.Series) -> float | None:
    if not pd.api.types.is_numeric_dtype(series):
        return None
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.median())


def cardinality(series: pd.Series) -> int | None:
    if pd.api.types.is_numeric_dtype(series) and series.nunique(dropna=True) > 25:
        return None
    return int(series.nunique(dropna=True))


def pearson_corr(x: pd.Series, y: pd.Series) -> float | None:
    x_clean, y_clean = align_non_null(x, y)
    if len(x_clean) < 2:
        return None
    try:
        value = x_clean.corr(y_clean, method="pearson")
        if pd.isna(value):
            return None
        return float(value)
    except Exception:
        return None


def spearman_corr(x: pd.Series, y: pd.Series) -> float | None:
    x_clean, y_clean = align_non_null(x, y)
    if len(x_clean) < 2:
        return None
    try:
        value = x_clean.corr(y_clean, method="spearman")
        if pd.isna(value):
            return None
        return float(value)
    except Exception:
        return None


def distance_correlation(x: pd.Series, y: pd.Series) -> float | None:
    x_clean, y_clean = align_non_null(x, y)
    if len(x_clean) < 2:
        return None
    xv = x_clean.to_numpy(dtype=float)
    yv = y_clean.to_numpy(dtype=float)
    if np.allclose(xv, xv.mean()) or np.allclose(yv, yv.mean()):
        return 0.0
    try:
        value = float(dcor.distance_correlation(xv, yv))
        if np.isnan(value):
            return None
        return value
    except Exception:
        return None


def align_non_null(x: pd.Series, y: pd.Series) -> tuple[pd.Series, pd.Series]:
    frame = pd.concat([sanitize_numeric(x), sanitize_numeric(y)], axis=1, keys=["x", "y"])
    frame = frame.dropna()
    return frame["x"], frame["y"]


def rolling_quantiles(series: pd.Series, window: int) -> pd.DataFrame:
    if not pd.api.types.is_numeric_dtype(series):
        raise ValueError("Rolling quantiles only available for numeric series")
    clean = series.astype(float)
    return pd.DataFrame(
        {
            "median": clean.rolling(window, min_periods=max(1, window // 2)).median(),
            "q25": clean.rolling(window, min_periods=max(1, window // 2)).quantile(0.25),
            "q75": clean.rolling(window, min_periods=max(1, window // 2)).quantile(0.75),
        }
    )


def rolling_correlation(target: pd.Series, feature: pd.Series, window: int) -> pd.Series:
    target_clean = sanitize_numeric(target)
    feature_clean = sanitize_numeric(feature)
    frame = pd.concat([target_clean, feature_clean], axis=1, keys=["target", "feature"])
    frame = frame.dropna()
    if frame.empty:
        return pd.Series(dtype=float)
    return frame["target"].rolling(window, min_periods=max(2, window // 2)).corr(frame["feature"])


def sample_dataframe(df: pd.DataFrame, sample_size: int) -> pd.DataFrame:
    if sample_size >= len(df):
        return df
    return df.sample(n=sample_size, random_state=42)


def ensure_list(iterable: Iterable[float] | np.ndarray) -> list[float]:
    return [float(value) for value in iterable]
