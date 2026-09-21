"""
EcoSetu Class Mapping Mechanism
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1

Deterministic mapping from external dataset categories to ECOSETU's 16 canonical
material categories. Strictly avoids ambiguous coercions.
"""

import re
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field

from ai.src.dataset.schema import CANONICAL_MATERIAL_CATEGORIES, MaterialCategoryEnum


class MappingResult(BaseModel):
    source_category: str = Field(..., description="Original raw label from external dataset")
    canonical_category: Optional[str] = Field(None, description="Mapped ECOSETU canonical MaterialCategory")
    status: str = Field(..., description="MAPPED | AMBIGUOUS | UNMAPPED")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Confidence in class mapping")
    reason: str = Field(..., description="Explanation of mapping decision")
    suggested_candidates: List[str] = Field(default_factory=list, description="Possible canonical categories if ambiguous")


# Exact and synonym dictionaries mapping normalized strings to MaterialCategoryEnum
EXACT_SYNONYM_MAP: Dict[str, MaterialCategoryEnum] = {
    # CRT
    "crt": MaterialCategoryEnum.CRT,
    "crt monitor": MaterialCategoryEnum.CRT,
    "crt television": MaterialCategoryEnum.CRT,
    "crt tv": MaterialCategoryEnum.CRT,
    "cathode ray tube": MaterialCategoryEnum.CRT,
    "picture tube": MaterialCategoryEnum.CRT,
    "color crt": MaterialCategoryEnum.CRT,
    "b/w crt": MaterialCategoryEnum.CRT,
    
    # LCD_PANEL
    "lcd panel": MaterialCategoryEnum.LCD_PANEL,
    "lcd screen": MaterialCategoryEnum.LCD_PANEL,
    "lcd display panel": MaterialCategoryEnum.LCD_PANEL,
    "tft lcd": MaterialCategoryEnum.LCD_PANEL,
    "laptop lcd": MaterialCategoryEnum.LCD_PANEL,
    "laptop screen panel": MaterialCategoryEnum.LCD_PANEL,
    "tv lcd panel": MaterialCategoryEnum.LCD_PANEL,
    "flat panel display screen": MaterialCategoryEnum.LCD_PANEL,
    
    # PCB
    "pcb": MaterialCategoryEnum.PCB,
    "printed circuit board": MaterialCategoryEnum.PCB,
    "circuit board": MaterialCategoryEnum.PCB,
    "motherboard": MaterialCategoryEnum.PCB,
    "computer motherboard": MaterialCategoryEnum.PCB,
    "mainboard": MaterialCategoryEnum.PCB,
    "logic board": MaterialCategoryEnum.PCB,
    "ram": MaterialCategoryEnum.PCB,
    "gpu": MaterialCategoryEnum.PCB,
    "graphics card": MaterialCategoryEnum.PCB,
    "expansion card": MaterialCategoryEnum.PCB,
    "telecom board": MaterialCategoryEnum.PCB,
    "power supply board": MaterialCategoryEnum.PCB,
    "green board": MaterialCategoryEnum.PCB,
    "populated circuit board": MaterialCategoryEnum.PCB,
    
    # CABLE
    "cable": MaterialCategoryEnum.CABLE,
    "cables": MaterialCategoryEnum.CABLE,
    "wire": MaterialCategoryEnum.CABLE,
    "wires": MaterialCategoryEnum.CABLE,
    "copper cable": MaterialCategoryEnum.CABLE,
    "aluminum cable": MaterialCategoryEnum.CABLE,
    "power cord": MaterialCategoryEnum.CABLE,
    "charger": MaterialCategoryEnum.CABLE,
    "phone charger": MaterialCategoryEnum.CABLE,
    "usb cable": MaterialCategoryEnum.CABLE,
    "charging cable": MaterialCategoryEnum.CABLE,
    "data cable": MaterialCategoryEnum.CABLE,
    "ethernet cable": MaterialCategoryEnum.CABLE,
    "insulated cable": MaterialCategoryEnum.CABLE,
    "cable charger": MaterialCategoryEnum.CABLE,
    "wire harness": MaterialCategoryEnum.CABLE,
    
    # BATTERY
    "battery": MaterialCategoryEnum.BATTERY,
    "batteries": MaterialCategoryEnum.BATTERY,
    "li ion": MaterialCategoryEnum.BATTERY,
    "li-ion": MaterialCategoryEnum.BATTERY,
    "lithium ion battery": MaterialCategoryEnum.BATTERY,
    "lithium battery": MaterialCategoryEnum.BATTERY,
    "lead acid battery": MaterialCategoryEnum.BATTERY,
    "lead acid": MaterialCategoryEnum.BATTERY,
    "ups battery": MaterialCategoryEnum.BATTERY,
    "nicd": MaterialCategoryEnum.BATTERY,
    "nimh": MaterialCategoryEnum.BATTERY,
    "nickel cadmium": MaterialCategoryEnum.BATTERY,
    "accumulator": MaterialCategoryEnum.BATTERY,
    "laptop battery": MaterialCategoryEnum.BATTERY,
    "mobile phone battery": MaterialCategoryEnum.BATTERY,
    
    # MOTOR
    "motor": MaterialCategoryEnum.MOTOR,
    "electric motor": MaterialCategoryEnum.MOTOR,
    "copper motor": MaterialCategoryEnum.MOTOR,
    "appliance motor": MaterialCategoryEnum.MOTOR,
    "fan motor": MaterialCategoryEnum.MOTOR,
    "copper wound motor": MaterialCategoryEnum.MOTOR,
    "stepper motor": MaterialCategoryEnum.MOTOR,
    "dc motor": MaterialCategoryEnum.MOTOR,
    
    # MAGNET_ASSEMBLY
    "magnet": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    "magnets": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    "magnet assembly": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    "permanent magnet": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    "speaker magnet": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    "hard drive magnet": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    "neodymium magnet": MaterialCategoryEnum.MAGNET_ASSEMBLY,
    
    # MIXED_PLASTIC
    "mixed plastic": MaterialCategoryEnum.MIXED_PLASTIC,
    "electronics plastic": MaterialCategoryEnum.MIXED_PLASTIC,
    "e-waste plastic": MaterialCategoryEnum.MIXED_PLASTIC,
    "device plastic casing": MaterialCategoryEnum.MIXED_PLASTIC,
    "plastic casing": MaterialCategoryEnum.MIXED_PLASTIC,
    "plastic housing": MaterialCategoryEnum.MIXED_PLASTIC,
    "appliance plastic": MaterialCategoryEnum.MIXED_PLASTIC,
    
    # MOBILE_PHONE
    "mobile": MaterialCategoryEnum.MOBILE_PHONE,
    "mobile phone": MaterialCategoryEnum.MOBILE_PHONE,
    "mobilephone": MaterialCategoryEnum.MOBILE_PHONE,
    "cell phone": MaterialCategoryEnum.MOBILE_PHONE,
    "cellphone": MaterialCategoryEnum.MOBILE_PHONE,
    "smartphone": MaterialCategoryEnum.MOBILE_PHONE,
    "smart phone": MaterialCategoryEnum.MOBILE_PHONE,
    "feature phone": MaterialCategoryEnum.MOBILE_PHONE,
    "telephone": MaterialCategoryEnum.MOBILE_PHONE,
    "cellular phone": MaterialCategoryEnum.MOBILE_PHONE,
    "iphone": MaterialCategoryEnum.MOBILE_PHONE,
    "android phone": MaterialCategoryEnum.MOBILE_PHONE,
    
    # LAPTOP
    "laptop": MaterialCategoryEnum.LAPTOP,
    "laptops": MaterialCategoryEnum.LAPTOP,
    "laptop computer": MaterialCategoryEnum.LAPTOP,
    "notebook": MaterialCategoryEnum.LAPTOP,
    "notebook computer": MaterialCategoryEnum.LAPTOP,
    "netbook": MaterialCategoryEnum.LAPTOP,
    "macbook": MaterialCategoryEnum.LAPTOP,
    "chromebook": MaterialCategoryEnum.LAPTOP,
    
    # MONITOR
    "monitor": MaterialCategoryEnum.MONITOR,
    "monitors": MaterialCategoryEnum.MONITOR,
    "computer monitor": MaterialCategoryEnum.MONITOR,
    "pc monitor": MaterialCategoryEnum.MONITOR,
    "display monitor": MaterialCategoryEnum.MONITOR,
    "lcd monitor": MaterialCategoryEnum.MONITOR,
    "led monitor": MaterialCategoryEnum.MONITOR,
    
    # PRINTER
    "printer": MaterialCategoryEnum.PRINTER,
    "printers": MaterialCategoryEnum.PRINTER,
    "computer printer": MaterialCategoryEnum.PRINTER,
    "laser printer": MaterialCategoryEnum.PRINTER,
    "inkjet printer": MaterialCategoryEnum.PRINTER,
    "scanner": MaterialCategoryEnum.PRINTER,
    "photocopier": MaterialCategoryEnum.PRINTER,
    "all in one printer": MaterialCategoryEnum.PRINTER,
    "copier": MaterialCategoryEnum.PRINTER,
    "fax machine": MaterialCategoryEnum.PRINTER,
    
    # KEYBOARD_MOUSE
    "keyboard": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "computer keyboard": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "mouse": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "computer mouse": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "computermouse": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "keyboard and mouse": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "keyboard mouse": MaterialCategoryEnum.KEYBOARD_MOUSE,
    "trackpad": MaterialCategoryEnum.KEYBOARD_MOUSE,
    
    # DESKTOP_COMPUTER
    "desktop": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "desktop computer": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "pc tower": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "computer tower": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "cpu tower": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "system unit": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "desktop pc": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "personal computer": MaterialCategoryEnum.DESKTOP_COMPUTER,
    "computer workstation": MaterialCategoryEnum.DESKTOP_COMPUTER,
    
    # TABLET
    "tablet": MaterialCategoryEnum.TABLET,
    "tablets": MaterialCategoryEnum.TABLET,
    "tablet computer": MaterialCategoryEnum.TABLET,
    "ipad": MaterialCategoryEnum.TABLET,
    "i pad": MaterialCategoryEnum.TABLET,
    "android tablet": MaterialCategoryEnum.TABLET,
    "e reader": MaterialCategoryEnum.TABLET,
    "kindle": MaterialCategoryEnum.TABLET,
    
    # OTHER
    "other": MaterialCategoryEnum.OTHER,
    "other ewaste": MaterialCategoryEnum.OTHER,
    "miscellaneous ewaste": MaterialCategoryEnum.OTHER,
}

# Ambiguous classes that MUST NOT be mapped automatically
AMBIGUOUS_CLASSES: Dict[str, List[str]] = {
    "electronic device": ["MOBILE_PHONE", "TABLET", "LAPTOP", "DESKTOP_COMPUTER"],
    "electronic devices": ["MOBILE_PHONE", "TABLET", "LAPTOP", "DESKTOP_COMPUTER"],
    "electronics": ["PCB", "MOBILE_PHONE", "LAPTOP", "CABLE", "OTHER"],
    "e waste": ["OTHER", "PCB", "DESKTOP_COMPUTER", "MOBILE_PHONE"],
    "e-waste": ["OTHER", "PCB", "DESKTOP_COMPUTER", "MOBILE_PHONE"],
    "ewaste": ["OTHER", "PCB", "DESKTOP_COMPUTER", "MOBILE_PHONE"],
    "electronic waste": ["OTHER", "PCB", "DESKTOP_COMPUTER", "MOBILE_PHONE"],
    "scrap": ["OTHER", "MIXED_PLASTIC", "CABLE"],
    "electronic scrap": ["PCB", "CABLE", "OTHER"],
    "gadget": ["MOBILE_PHONE", "TABLET", "KEYBOARD_MOUSE"],
    "gadgets": ["MOBILE_PHONE", "TABLET", "KEYBOARD_MOUSE"],
    "metal": ["MOTOR", "MAGNET_ASSEMBLY", "CABLE"],
    "scrap metal": ["MOTOR", "MAGNET_ASSEMBLY", "CABLE"],
    "component": ["PCB", "MOTOR", "BATTERY"],
    "components": ["PCB", "MOTOR", "BATTERY"],
    "hardware": ["DESKTOP_COMPUTER", "PCB", "OTHER"],
    "device": ["MOBILE_PHONE", "LAPTOP", "TABLET"],
    "waste": ["OTHER"],
    "trash": ["OTHER"],
    "mixed items": ["OTHER"],
    "tv": ["CRT", "MONITOR"],
    "television": ["CRT", "MONITOR"],
}


class ClassMapper:
    """
    Normalizes external class names to ECOSETU's canonical 16 categories.
    Enforces strict non-coercion of ambiguous labels.
    """

    @staticmethod
    def normalize_label(label: str) -> str:
        """Lowercases, trims, and strips non-alphanumeric separators."""
        if not label:
            return ""
        # Handle CamelCase transitions e.g. "ComputerMouse" -> "Computer Mouse"
        cleaned = re.sub(r"([a-z])([A-Z])", r"\1 \2", label.strip())
        cleaned = cleaned.lower()
        cleaned = re.sub(r"[_\-]+", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()

    @classmethod
    def map_class(cls, source_label: str) -> MappingResult:
        """
        Maps a single source label to an ECOSETU canonical MaterialCategory.
        Never maps ambiguous classes automatically.
        """
        if not source_label or not source_label.strip():
            return MappingResult(
                source_category="",
                canonical_category=None,
                status="UNMAPPED",
                confidence=0.0,
                reason="Empty or null source label provided"
            )

        norm = cls.normalize_label(source_label)
        raw_lower = source_label.lower().strip()

        # 1. Direct canonical match (e.g. "MOBILE_PHONE" or "mobile phone")
        for cat in MaterialCategoryEnum:
            if norm == cat.value.lower().replace("_", " ") or norm == cat.value.lower():
                return MappingResult(
                    source_category=source_label,
                    canonical_category=cat.value,
                    status="MAPPED",
                    confidence=1.0,
                    reason=f"Direct match with canonical category {cat.value}"
                )

        # 2. Check for ambiguous classes (NEVER auto-coerce)
        for amb_key, candidates in AMBIGUOUS_CLASSES.items():
            if norm == cls.normalize_label(amb_key) or raw_lower == amb_key:
                return MappingResult(
                    source_category=source_label,
                    canonical_category=None,
                    status="AMBIGUOUS",
                    confidence=0.0,
                    reason=f"Label '{source_label}' is ambiguous and cannot be safely coerced to a single category.",
                    suggested_candidates=candidates
                )

        # 3. Known synonym lookup
        if norm in EXACT_SYNONYM_MAP:
            mapped_cat = EXACT_SYNONYM_MAP[norm]
            return MappingResult(
                source_category=source_label,
                canonical_category=mapped_cat.value,
                status="MAPPED",
                confidence=1.0,
                reason=f"Matched standard synonym '{norm}' to {mapped_cat.value}"
            )

        # 4. Unmapped class
        return MappingResult(
            source_category=source_label,
            canonical_category=None,
            status="UNMAPPED",
            confidence=0.0,
            reason=f"Label '{source_label}' has no canonical mapping in ECOSETU material taxonomy."
        )

    @classmethod
    def batch_map(cls, source_labels: List[str]) -> Dict[str, MappingResult]:
        """Maps a collection of distinct labels."""
        return {label: cls.map_class(label) for label in set(source_labels)}
