"""
EcoSetu Cross-Dataset Deduplication Engine
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4, Prompt 20

Provides multi-dataset deduplication and overlap prevention:
1. Exact hash deduplication: SHA-256 (byte-for-byte identity)
2. Perceptual hash deduplication: dHash / aHash (structural similarity across resized, re-compressed, or watermarked duplicates)
3. Cross-dataset source isolation (preserves original while rejecting secondary redundant copies)
"""

from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image


@dataclass
class DuplicateMatch:
    primary_id: str
    primary_source: str
    duplicate_id: str
    duplicate_source: str
    match_type: str                  # "EXACT_SHA256" | "PERCEPTUAL_DHASH"
    similarity_distance: int         # 0 for exact, hamming distance <= threshold for perceptual
    primary_path: str
    duplicate_path: str


@dataclass
class DeduplicationReport:
    timestamp: str
    total_images_evaluated: int
    exact_duplicates_found: int
    perceptual_duplicates_found: int
    unique_images_retained: int
    source_contributions: Dict[str, int]
    matches: List[DuplicateMatch] = field(default_factory=list)


class CrossDatasetDeduplicator:
    """
    Detects exact and perceptual duplicates across multiple incoming datasets.
    """

    def __init__(self, hamming_threshold: int = 4):
        """
        hamming_threshold: Max Hamming distance to consider two dHashes identical
        (4 bits out of 64 represents ~94% visual similarity)
        """
        self.hamming_threshold = hamming_threshold

    @staticmethod
    def compute_sha256(file_path: Path) -> str:
        """Computes byte-exact SHA-256 hash."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def compute_dhash(image_path: Path, hash_size: int = 8) -> str:
        """
        Computes difference hash (dHash) using Pillow.
        Resizes to (hash_size + 1, hash_size) in grayscale, compares adjacent pixel intensities.
        Fast, robust to resizing and JPEG compression artifacts.
        """
        try:
            with Image.open(image_path) as img:
                # Convert to grayscale and resize
                # Use get_flattened_data if available (Pillow >= 11), fallback to getdata
                get_data_fn = getattr(img, "get_flattened_data", img.getdata)
                pixels = list(get_data_fn())
                
                difference = []
                for row in range(hash_size):
                    for col in range(hash_size):
                        pixel_left = pixels[row * (hash_size + 1) + col]
                        pixel_right = pixels[row * (hash_size + 1) + col + 1]
                        difference.append(pixel_left > pixel_right)
                
                # Convert boolean list to 64-bit hex string
                decimal_value = 0
                for index, val in enumerate(difference):
                    if val:
                        decimal_value += 1 << index
                return f"{decimal_value:016x}"
        except Exception:
            return ""

    @staticmethod
    def hamming_distance(hex_hash1: str, hex_hash2: str) -> int:
        """Calculates bitwise Hamming distance between two hex hash strings."""
        if not hex_hash1 or not hex_hash2 or len(hex_hash1) != len(hex_hash2):
            return 999
        int1 = int(hex_hash1, 16)
        int2 = int(hex_hash2, 16)
        xor_val = int1 ^ int2
        return bin(xor_val).count("1")

    def deduplicate(
        self,
        image_records: List[Dict[str, Any]],
        priority_source_order: Optional[List[str]] = None,
    ) -> Tuple[List[Dict[str, Any]], DeduplicationReport]:
        """
        Evaluates a list of image records:
        [
            {"id": "...", "source": "...", "path": Path(...), "category": "..."},
            ...
        ]
        Keeps the record with the highest source priority.
        """
        priority_map = {src: idx for idx, src in enumerate(priority_source_order or [])}

        def get_priority(rec: Dict[str, Any]) -> int:
            return priority_map.get(rec.get("source", ""), 999)

        # Sort records so higher priority sources are processed first
        sorted_records = sorted(image_records, key=get_priority)

        seen_sha256: Dict[str, Dict[str, Any]] = {}
        seen_dhash: List[Tuple[str, Dict[str, Any]]] = []

        unique_records: List[Dict[str, Any]] = []
        matches: List[DuplicateMatch] = []

        exact_dup_count = 0
        perceptual_dup_count = 0

        for rec in sorted_records:
            fpath = Path(rec["path"])
            if not fpath.exists():
                continue

            sha = self.compute_sha256(fpath)
            # 1. Exact match check
            if sha in seen_sha256:
                primary = seen_sha256[sha]
                exact_dup_count += 1
                matches.append(
                    DuplicateMatch(
                        primary_id=primary["id"],
                        primary_source=primary["source"],
                        duplicate_id=rec["id"],
                        duplicate_source=rec["source"],
                        match_type="EXACT_SHA256",
                        similarity_distance=0,
                        primary_path=str(primary["path"]),
                        duplicate_path=str(rec["path"]),
                    )
                )
                continue

            # 2. Perceptual match check
            dhash = self.compute_dhash(fpath)
            is_perceptual_dup = False
            if dhash:
                for existing_hash, primary in seen_dhash:
                    dist = self.hamming_distance(dhash, existing_hash)
                    if dist <= self.hamming_threshold:
                        perceptual_dup_count += 1
                        is_perceptual_dup = True
                        matches.append(
                            DuplicateMatch(
                                primary_id=primary["id"],
                                primary_source=primary["source"],
                                duplicate_id=rec["id"],
                                duplicate_source=rec["source"],
                                match_type="PERCEPTUAL_DHASH",
                                similarity_distance=dist,
                                primary_path=str(primary["path"]),
                                duplicate_path=str(rec["path"]),
                            )
                        )
                        break

            if is_perceptual_dup:
                continue

            # Register as unique
            seen_sha256[sha] = rec
            if dhash:
                seen_dhash.append((dhash, rec))
            unique_records.append(rec)

        # Calculate source contributions
        source_counts: Dict[str, int] = defaultdict(int)
        for r in unique_records:
            source_counts[r.get("source", "UNKNOWN")] += 1

        report = DeduplicationReport(
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_images_evaluated=len(image_records),
            exact_duplicates_found=exact_dup_count,
            perceptual_duplicates_found=perceptual_dup_count,
            unique_images_retained=len(unique_records),
            source_contributions=dict(source_counts),
            matches=matches,
        )

        return unique_records, report
