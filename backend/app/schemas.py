from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class QuantileSummary(BaseModel):
    q05: float
    q25: float
    q50: float
    q75: float
    q95: float


class HistogramBin(BaseModel):
    label: str
    value: float


class FeatureSummary(BaseModel):
    id: str
    name: str
    type: str
    cardinality: Optional[int] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    pearson: Optional[float] = None
    spearman: Optional[float] = None
    distance: Optional[float] = None
    quantiles: Optional[QuantileSummary] = None
    sparkline: List[float] = Field(default_factory=list)
    distribution: List[HistogramBin] = Field(default_factory=list)


class DatasetSummary(BaseModel):
    name: str
    rows: int
    columns: int
    sampleSize: int
    lastUpdated: str
    targets: List[str]
    features: List[FeatureSummary]


class CorrelationRecord(BaseModel):
    feature: str
    pearson: float
    spearman: float
    distance: float


class CompareSeries(BaseModel):
    name: str
    data: List[List[float]]


class CompareResponse(BaseModel):
    config: "CompareConfig"
    series: List[CompareSeries]


class CompareConfig(BaseModel):
    x: Optional[str]
    y: Optional[str]
    color: Optional[str]
    chartType: str


CompareResponse.model_rebuild()


class TimeSeriesPoint(BaseModel):
    key: str
    value: float


class TimeCorrelationSeries(BaseModel):
    feature: str
    target: str
    window: int
    orderField: Optional[str]
    values: List[TimeSeriesPoint]


class FeatureTrendPoint(BaseModel):
    key: str
    median: float
    q25: float
    q75: float


class TimeLensResponse(BaseModel):
    correlation: TimeCorrelationSeries
    featureTrend: List[FeatureTrendPoint]


class SampleUpdateRequest(BaseModel):
    delta: Optional[int] = None
    sampleSize: Optional[int] = None

    def resolve_delta(self) -> int:
        if self.delta is None and self.sampleSize is None:
            raise ValueError("Either delta or sampleSize must be provided")
        if self.delta is not None:
            return self.delta
        raise ValueError("Delta not provided")


class TimeLensRequest(BaseModel):
    feature: str
    target: str
    window: int = 30
    orderField: Optional[str] = None


class CompareRequest(BaseModel):
    config: CompareConfig
