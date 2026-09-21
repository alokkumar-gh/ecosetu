"""
EcoSetu Deterministic Dataset Splitter
Canonical Reference: docs/12_AI_TRAINING_PLAN.md Section 2

Provides reproducible, group-aware, stratified dataset splitting into
train (70%), validation (20%), and test (10%) partitions.
Guarantees zero data leakage by keeping identical content hashes and
grouped items (e.g. same MaterialLot) in the same partition.
"""

from collections import defaultdict
import random
from typing import Dict, List, Optional, Set, Tuple

from ai.src.dataset.schema import DatasetSplitEnum, ImageMetadata


class DatasetSplitter:
    """
    Splits dataset records deterministically into TRAIN, VAL, and TEST partitions.
    """

    def __init__(
        self,
        train_ratio: float = 0.70,
        val_ratio: float = 0.20,
        test_ratio: float = 0.10,
        random_seed: int = 42,
    ):
        total = train_ratio + val_ratio + test_ratio
        if not (0.99 <= total <= 1.01):
            raise ValueError(f"Split ratios must sum to 1.0, got: {total}")

        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.random_seed = random_seed

    def split_records(
        self,
        records: List[ImageMetadata],
        preserve_existing_splits: bool = False,
    ) -> Tuple[List[ImageMetadata], Dict[str, int]]:
        """
        Assigns split to each record in a deterministic, group-aware fashion.
        Returns the updated list of records and split distribution counts.
        """
        rng = random.Random(self.random_seed)

        # If preserving existing splits, only assign UNASSIGNED
        if preserve_existing_splits:
            records_to_split = [r for r in records if r.split == DatasetSplitEnum.UNASSIGNED]
            fixed_records = [r for r in records if r.split != DatasetSplitEnum.UNASSIGNED]
        else:
            records_to_split = records
            fixed_records = []

        # Cluster records into atomic units (by group_id or sha256 or image_id)
        # to ensure no leakage across splits.
        units: Dict[str, List[ImageMetadata]] = defaultdict(list)
        unit_category: Dict[str, str] = {}

        for r in records_to_split:
            # Unit key: prefer group_id, then sha256, else image_id
            if r.group_id:
                u_key = f"group:{r.group_id}"
            elif r.sha256:
                u_key = f"sha:{r.sha256}"
            else:
                u_key = f"img:{r.image_id}"

            units[u_key].append(r)
            if u_key not in unit_category:
                unit_category[u_key] = r.ecosetu_category or "UNKNOWN"

        # Stratify atomic units by category
        category_to_units: Dict[str, List[str]] = defaultdict(list)
        for u_key, cat in unit_category.items():
            category_to_units[cat].append(u_key)

        assigned_units: Dict[str, DatasetSplitEnum] = {}

        # For each category, sort deterministically, shuffle with seed, and allocate
        for cat, unit_keys in sorted(category_to_units.items()):
            # Sort first for cross-platform deterministic stability
            unit_keys.sort()
            rng.shuffle(unit_keys)

            n = len(unit_keys)
            n_train = int(round(n * self.train_ratio))
            n_val = int(round(n * self.val_ratio))
            
            # Ensure at least 1 in train if items exist
            if n > 0 and n_train == 0:
                n_train = 1

            for i, u_key in enumerate(unit_keys):
                if i < n_train:
                    assigned_units[u_key] = DatasetSplitEnum.TRAIN
                elif i < (n_train + n_val):
                    assigned_units[u_key] = DatasetSplitEnum.VAL
                else:
                    assigned_units[u_key] = DatasetSplitEnum.TEST

        # Apply assigned splits to all records in the atomic units
        for u_key, recs in units.items():
            target_split = assigned_units.get(u_key, DatasetSplitEnum.TRAIN)
            for r in recs:
                r.split = target_split

        all_records = fixed_records + records_to_split
        counts = {
            DatasetSplitEnum.TRAIN.value: sum(1 for r in all_records if r.split == DatasetSplitEnum.TRAIN),
            DatasetSplitEnum.VAL.value: sum(1 for r in all_records if r.split == DatasetSplitEnum.VAL),
            DatasetSplitEnum.TEST.value: sum(1 for r in all_records if r.split == DatasetSplitEnum.TEST),
            DatasetSplitEnum.UNASSIGNED.value: sum(1 for r in all_records if r.split == DatasetSplitEnum.UNASSIGNED),
        }

        return all_records, counts
