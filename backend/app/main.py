from __future__ import annotations

from typing import Annotated

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

app = FastAPI(title="EDA Copilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MANAGER = DatasetManager()


async def get_manager() -> DatasetManager:
    return MANAGER


@app.post("/dataset/load", response_model=DatasetSummary)
async def load_dataset(
    file: UploadFile = File(...),
    manager: Annotated[DatasetManager, Depends(get_manager)],
) -> DatasetSummary:
    try:
        content = await file.read()
        meta = manager.load_file(content, file.filename or "dataset")
        return DatasetSummary(**manager.dataset_summary())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/dataset/summary", response_model=DatasetSummary)
async def dataset_summary(
    manager: Annotated[DatasetManager, Depends(get_manager)],
) -> DatasetSummary:
    try:
        return DatasetSummary(**manager.dataset_summary())
    except DatasetNotLoadedError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/dataset/sample", response_model=DatasetSummary)
async def update_sample(
    payload: SampleUpdateRequest,
    manager: Annotated[DatasetManager, Depends(get_manager)],
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
    manager: Annotated[DatasetManager, Depends(get_manager)],
):
    try:
        return manager.correlations_for_target(target)
    except (DatasetNotLoadedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/compare", response_model=CompareResponse)
async def compare_features(
    payload: CompareRequest,
    manager: Annotated[DatasetManager, Depends(get_manager)],
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
    manager: Annotated[DatasetManager, Depends(get_manager)],
) -> TimeLensResponse:
    try:
        result = manager.time_lens(payload.feature, payload.target, payload.window, payload.orderField)
        return TimeLensResponse(**result)
    except (DatasetNotLoadedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
