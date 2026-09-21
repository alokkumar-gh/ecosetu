"""
EcoSetu AI Dataset Module
Authoritative management of material classification dataset schemas, class mapping,
quality validation, deterministic splitting, and provenance manifests.
"""

from ai.src.dataset.schema import (
    DatasetSourceType,
    MaterialCategoryEnum,
    ItemConditionEnum,
    SourceOriginEnum,
    AnnotationStatusEnum,
    ImageQualityStatusEnum,
    DuplicateStatusEnum,
    DatasetSplitEnum,
    ValidationStatusEnum,
    ImageMetadata,
    CANONICAL_MATERIAL_CATEGORIES,
)
from ai.src.dataset.class_mapper import ClassMapper
from ai.src.dataset.validator import DatasetValidator, ValidationReport
from ai.src.dataset.splitter import DatasetSplitter
from ai.src.dataset.manifest import ManifestManager, DatasetManifest
from ai.src.dataset.detection_builder import (
    BBoxAnnotation,
    DetectionDatasetBuilder,
    DetectionValidationSummary,
)
from ai.src.dataset.quality_gate import (
    ColabDatasetBuildHarness,
    QualityGateResult,
)

__all__ = [
    "DatasetSourceType",
    "MaterialCategoryEnum",
    "ItemConditionEnum",
    "SourceOriginEnum",
    "AnnotationStatusEnum",
    "ImageQualityStatusEnum",
    "DuplicateStatusEnum",
    "DatasetSplitEnum",
    "ValidationStatusEnum",
    "ImageMetadata",
    "CANONICAL_MATERIAL_CATEGORIES",
    "ClassMapper",
    "DatasetValidator",
    "ValidationReport",
    "DatasetSplitter",
    "ManifestManager",
    "DatasetManifest",
    "CrossDatasetDeduplicator",
    "DeduplicationReport",
    "BBoxAnnotation",
    "DetectionDatasetBuilder",
    "DetectionValidationSummary",
    "ColabDatasetBuildHarness",
    "QualityGateResult",
]


