from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .dataset_manager import DatasetManager, DatasetNotLoadedError
from .schemas import (
    CompareRequest,
    CompareResponse,
    DatasetSummary,
    SampleUpdateRequest,
    TimeLensRequest,
    TimeLensResponse,
)

logger = logging.getLogger("eda_copilot")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
logger.setLevel(logging.INFO)

app = FastAPI(title="EDA Copilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MANAGER = DatasetManager()


def _generate_demo_dataset(rows: int = 8_000) -> pd.DataFrame:
    rng = np.random.default_rng(seed=42)
    half = rows // 2
    x1 = rng.normal(loc=0.0, scale=1.1, size=rows)
    x2 = rng.normal(loc=0.0, scale=1.0, size=rows)
    x3 = rng.normal(loc=0.5, scale=1.2, size=rows)
    x4 = rng.normal(loc=-0.25, scale=0.9, size=rows)
    noise = rng.normal(loc=0.0, scale=0.2, size=rows)

    y = np.empty(rows)
    y[:half] = x1[:half] + np.sin(x2[:half]) + noise[:half]
    y[half:] = x3[half:] + np.sin(x4[half:]) + noise[half:]

    timestamp = pd.date_range("2023-01-01", periods=rows, freq="H")
    segment = np.where(np.arange(rows) < half, "phase_1", "phase_2")
    category = rng.choice(["alpha", "beta", "gamma"], size=rows, p=[0.4, 0.35, 0.25])
    x_mix = 0.6 * x1 + 0.4 * x3 + rng.normal(loc=0.0, scale=0.15, size=rows)

    return pd.DataFrame(
        {
            "timestamp": timestamp,
            "x1": x1,
            "x2": x2,
            "x3": x3,
            "x4": x4,
            "x_mix": x_mix,
            "noise": noise,
            "y": y,
            "segment": segment,
            "category": category,
        }
    )


def _bootstrap_demo_dataset() -> None:
    if MANAGER.is_loaded:
        try:
            meta = MANAGER.metadata
            logger.info("Dataset already loaded: name=%s rows=%s cols=%s", meta.name, meta.rows, meta.columns)
        except Exception:
            logger.info("Dataset already loaded")
        return
    demo_df = _generate_demo_dataset()
    MANAGER.load_dataframe(demo_df, name="synthetic_demo")
    logger.info("Loaded synthetic demo dataset: rows=%s cols=%s", len(demo_df), demo_df.shape[1])


_bootstrap_demo_dataset()


async def get_manager() -> DatasetManager:
    return MANAGER


@app.post("/dataset/load", response_model=DatasetSummary)
async def load_dataset(
    file: UploadFile = File(...),
    manager: DatasetManager = Depends(get_manager),
) -> DatasetSummary:
    try:
        content = await file.read()
        meta = manager.load_file(content, file.filename or "dataset")
        summary = manager.dataset_summary()
        logger.info(
            "Loaded dataset from upload: name=%s rows=%s cols=%s sample=%s",
            meta.name,
            meta.rows,
            meta.columns,
            summary.get("sampleSize"),
        )
        return DatasetSummary(**summary)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/dataset/summary", response_model=DatasetSummary)
async def dataset_summary(
    manager: DatasetManager = Depends(get_manager),
) -> DatasetSummary:
    try:
        summary = manager.dataset_summary()
        logger.info(
            "Served dataset summary: name=%s sample=%s features=%s targets=%s",
            summary.get("name"),
            summary.get("sampleSize"),
            len(summary.get("features", [])),
            summary.get("targets"),
        )
        return DatasetSummary(**summary)
    except DatasetNotLoadedError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/dataset/sample", response_model=DatasetSummary)
async def update_sample(
    payload: SampleUpdateRequest,
    manager: DatasetManager = Depends(get_manager),
) -> DatasetSummary:
    try:
        if payload.sampleSize is not None:
            manager.set_sample_size(payload.sampleSize)
        elif payload.delta is not None:
            manager.adjust_sample(payload.delta)
        else:
            raise HTTPException(status_code=400, detail="Provide either sampleSize or delta")
        return DatasetSummary(**manager.dataset_summary())
    except DatasetNotLoadedError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/dataset/{target}/correlations")
async def target_correlations(
    target: str,
    manager: DatasetManager = Depends(get_manager),
):
    try:
        return manager.correlations_for_target(target)
    except (DatasetNotLoadedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/compare", response_model=CompareResponse)
async def compare_features(
    payload: CompareRequest,
    manager: DatasetManager = Depends(get_manager),
) -> CompareResponse:
    config = payload.config
    try:
        series = manager.compare_series(config.x or "", config.y, config.chartType)
        return CompareResponse(config=config, series=series)
    except (DatasetNotLoadedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/time-lens", response_model=TimeLensResponse)
async def time_lens(
    payload: TimeLensRequest,
    manager: DatasetManager = Depends(get_manager),
) -> TimeLensResponse:
    try:
        result = manager.time_lens(payload.feature, payload.target, payload.window, payload.orderField)
        return TimeLensResponse(**result)
    except (DatasetNotLoadedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
