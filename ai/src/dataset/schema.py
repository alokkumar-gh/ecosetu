"""
EcoSetu AI Dataset Metadata Schema
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md, docs/13_SECURITY_PRIVACY.md

Defines machine-readable schemas, enumerations, privacy guards, and manifest models
for ECOSETU's AI/ML material classification dataset foundation.
"""

from enum import Enum
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ==============================================================================
# ENUMERATIONS
# ==============================================================================

class DatasetSourceType(str, Enum):
    EXTERNAL_PUBLIC = "EXTERNAL_PUBLIC"
    FIELD_COLLECTED = "FIELD_COLLECTED"
    ECOSETU_PRODUCTION = "ECOSETU_PRODUCTION"
    SYNTHETIC_TEST = "SYNTHETIC_TEST"


class MaterialCategoryEnum(str, Enum):
    CRT = "CRT"
    LCD_PANEL = "LCD_PANEL"
    PCB = "PCB"
    CABLE = "CABLE"
    BATTERY = "BATTERY"
    MOTOR = "MOTOR"
    MAGNET_ASSEMBLY = "MAGNET_ASSEMBLY"
    MIXED_PLASTIC = "MIXED_PLASTIC"
    MOBILE_PHONE = "MOBILE_PHONE"
    LAPTOP = "LAPTOP"
    MONITOR = "MONITOR"
    PRINTER = "PRINTER"
    KEYBOARD_MOUSE = "KEYBOARD_MOUSE"
    DESKTOP_COMPUTER = "DESKTOP_COMPUTER"
    TABLET = "TABLET"
    OTHER = "OTHER"


CANONICAL_MATERIAL_CATEGORIES = [c.value for c in MaterialCategoryEnum]


class ItemConditionEnum(str, Enum):
    WORKING = "WORKING"
    NOT_WORKING = "NOT_WORKING"
    DAMAGED = "DAMAGED"
    UNKNOWN = "UNKNOWN"


class SourceOriginEnum(str, Enum):
    HOUSEHOLD = "HOUSEHOLD"
    COMMERCIAL = "COMMERCIAL"
    INDUSTRIAL = "INDUSTRIAL"
    STREET = "STREET"
    OTHER = "OTHER"


class AnnotationStatusEnum(str, Enum):
    UNANNOTATED = "UNANNOTATED"
    WEAKLY_LABELED = "WEAKLY_LABELED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class ImageQualityStatusEnum(str, Enum):
    VALID = "VALID"
    BLURRY = "BLURRY"
    CORRUPT = "CORRUPT"
    LOW_RESOLUTION = "LOW_RESOLUTION"
    UNVERIFIED = "UNVERIFIED"


class DuplicateStatusEnum(str, Enum):
    ORIGINAL = "ORIGINAL"
    EXACT_DUPLICATE = "EXACT_DUPLICATE"
    NEAR_DUPLICATE = "NEAR_DUPLICATE"


class DatasetSplitEnum(str, Enum):
    TRAIN = "TRAIN"
    VAL = "VAL"
    TEST = "TEST"
    UNASSIGNED = "UNASSIGNED"


class ValidationStatusEnum(str, Enum):
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"


# ==============================================================================
# PRIVACY / PII DETECTION PATTERNS
# ==============================================================================

# Regular expressions for detecting sensitive personal identifiable information
PHONE_REGEX = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
AADHAAR_REGEX = re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b")
SENSITIVE_KEY_SUBSTRINGS = [
    "phone", "mobile", "password", "secret", "token", "aadhaar", "pan",
    "bank", "account_num", "credit_card", "ssn", "auth"
]


def check_for_pii(data_dict: Dict[str, Any], prefix: str = "") -> List[str]:
    """
    Recursively scans keys and string values for private personal information.
    Returns list of violation descriptions.
    """
    violations = []
    for k, v in data_dict.items():
        key_name = f"{prefix}{k}"
        # Check key names for sensitive patterns
        key_lower = k.lower()
        if any(sens in key_lower for sens in SENSITIVE_KEY_SUBSTRINGS):
            violations.append(f"Disallowed privacy-sensitive field key: '{key_name}'")
        
        # Check string values for sensitive patterns
        if isinstance(v, str):
            if PHONE_REGEX.search(v):
                violations.append(f"Phone number pattern detected in '{key_name}'")
            if EMAIL_REGEX.search(v):
                violations.append(f"Email pattern detected in '{key_name}'")
            if PAN_REGEX.search(v):
                violations.append(f"Indian PAN pattern detected in '{key_name}'")
            if AADHAAR_REGEX.search(v):
                violations.append(f"Indian Aadhaar pattern detected in '{key_name}'")
        elif isinstance(v, dict):
            violations.extend(check_for_pii(v, prefix=f"{key_name}."))
    return violations


# ==============================================================================
# IMAGE METADATA SCHEMA
# ==============================================================================

class CoarseLocation(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    lat_approx: Optional[float] = Field(None, description="Coarse latitude rounded to max 2 decimals")
    lng_approx: Optional[float] = Field(None, description="Coarse longitude rounded to max 2 decimals")

    @field_validator("lat_approx", "lng_approx")
    @classmethod
    def round_coordinates(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            # Enforce coarse precision (maximum 2 decimal places ~ 1.1 km precision)
            return round(v, 2)
        return None


class ImageMetadata(BaseModel):
    """
    Machine-readable metadata schema for material images.
    Supports external datasets, field collections, and future production records.
    """
    image_id: str = Field(..., description="Unique deterministic or random identifier for the image")
    file_path: str = Field(..., description="Relative file path from dataset root")
    dataset_id: str = Field(..., description="Source dataset identifier")
    source_type: DatasetSourceType = Field(..., description="Explicit source origin type")
    source_url: Optional[str] = Field(None, description="Source URL or publication reference")
    license: str = Field("LICENSE_UNVERIFIED", description="Dataset license or LICENSE_UNVERIFIED")
    collection_date: Optional[str] = Field(None, description="ISO-8601 collection timestamp if known")
    
    ecosetu_category: Optional[str] = Field(None, description="Canonical ECOSETU MaterialCategory")
    source_category: Optional[str] = Field(None, description="Raw label from original source")
    subcategory: Optional[str] = Field(None, description="Specific subcategory if available")
    description: Optional[str] = Field(None, description="Objective visual description")
    condition: Optional[ItemConditionEnum] = Field(None, description="Condition of the item")
    approximate_weight_kg: Optional[float] = Field(None, ge=0.0, description="Approximate weight in kg")
    source_origin: Optional[SourceOriginEnum] = Field(None, description="Origin context")
    
    coarse_location: Optional[CoarseLocation] = Field(None, description="Coarse geographic context")
    group_id: Optional[str] = Field(None, description="Lot or cluster reference for grouping without split leakage")
    
    annotation_status: AnnotationStatusEnum = Field(AnnotationStatusEnum.UNANNOTATED, description="Verification status of label")
    quality_status: ImageQualityStatusEnum = Field(ImageQualityStatusEnum.UNVERIFIED, description="Visual quality status")
    duplicate_status: DuplicateStatusEnum = Field(DuplicateStatusEnum.ORIGINAL, description="Deduplication status")
    split: DatasetSplitEnum = Field(DatasetSplitEnum.UNASSIGNED, description="Dataset split assignment")
    
    provenance: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Detailed ingestion/transform history")
    validation_status: ValidationStatusEnum = Field(ValidationStatusEnum.PENDING, description="Validation report outcome")
    
    sha256: Optional[str] = Field(None, description="SHA-256 hash of image file contents")
    width: Optional[int] = Field(None, ge=1, description="Pixel width")
    height: Optional[int] = Field(None, ge=1, description="Pixel height")
    format: Optional[str] = Field(None, description="Image format (JPEG, PNG)")
    file_size_bytes: Optional[int] = Field(None, ge=0, description="File size in bytes")

    @field_validator("ecosetu_category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CANONICAL_MATERIAL_CATEGORIES:
            raise ValueError(
                f"Invalid ECOSETU material category '{v}'. "
                f"Must be one of canonical categories: {CANONICAL_MATERIAL_CATEGORIES}"
            )
        return v

    @model_validator(mode="before")
    @classmethod
    def enforce_privacy_and_security(cls, values: Any) -> Any:
        if isinstance(values, dict):
            violations = check_for_pii(values)
            if violations:
                raise ValueError(
                    f"Privacy violation: Personal Identifiable Information (PII) rejected in dataset metadata: "
                    f"{'; '.join(violations)}"
                )
        return values


# ==============================================================================
# DATASET MANIFEST SCHEMA
# ==============================================================================

class DatasetManifest(BaseModel):
    """
    Machine-readable manifest describing a versioned ECOSETU material dataset.
    """
    dataset_name: str = Field(..., description="Human-readable dataset name")
    dataset_id: str = Field(..., description="Unique dataset identifier slug")
    version: str = Field(..., description="Semantic version string (e.g. v0.1.0)")
    source: str = Field(..., description="Source name or entity")
    source_type: DatasetSourceType = Field(..., description="Explicit source origin type")
    source_url_reference: str = Field(..., description="Source URL or document citation")
    license: str = Field("LICENSE_UNVERIFIED", description="License identifier or LICENSE_UNVERIFIED")
    download_import_date: str = Field(..., description="ISO-8601 import timestamp")
    
    original_class_count: int = Field(..., ge=0, description="Count of classes in source dataset")
    mapped_ecosetu_class_count: int = Field(..., ge=0, description="Count of canonical ECOSETU classes represented")
    total_records: int = Field(..., ge=0, description="Total image records in dataset")
    
    split_counts: Dict[str, int] = Field(default_factory=dict, description="Counts per split (TRAIN, VAL, TEST)")
    class_distribution: Dict[str, int] = Field(default_factory=dict, description="Counts per canonical category")
    
    random_seed: int = Field(42, description="Deterministic random seed used for splitting")
    split_strategy: str = Field("STRATIFIED_GROUP_AWARE", description="Splitting algorithm used")
    split_ratios: Dict[str, float] = Field(
        default_factory=lambda: {"train": 0.70, "val": 0.20, "test": 0.10},
        description="Target split proportions"
    )
    
    preprocessing_performed: List[str] = Field(default_factory=list, description="Preprocessing operations logged")
    filtering_performed: List[str] = Field(default_factory=list, description="Quality and deduplication filters applied")
    validation_summary: Dict[str, Any] = Field(default_factory=dict, description="Validation report outcome metrics")
    known_limitations: List[str] = Field(default_factory=list, description="Documented caveats and limitations")
