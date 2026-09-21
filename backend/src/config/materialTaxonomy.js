// EcoSetu Material Taxonomy Configuration (SIH 26229 Problem Statement)
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1

const { MATERIAL_CATEGORIES } = require('../utils/constants');

const MATERIAL_TAXONOMY = Object.freeze({
  [MATERIAL_CATEGORIES.CRT]: {
    id: MATERIAL_CATEGORIES.CRT,
    code: 'CRT',
    icon: 'tv-classic',
    symbol: '📺',
    subcategories: [
      { id: 'COLOR_CRT_MONITOR', code: 'COLOR_CRT' },
      { id: 'BW_CRT_MONITOR', code: 'BW_CRT' },
      { id: 'CRT_PICTURE_TUBE', code: 'PICTURE_TUBE' },
    ],
  },
  [MATERIAL_CATEGORIES.LCD_PANEL]: {
    id: MATERIAL_CATEGORIES.LCD_PANEL,
    code: 'LCD_PANEL',
    icon: 'monitor-screenshot',
    symbol: '🖥️',
    subcategories: [
      { id: 'LAPTOP_LCD_PANEL', code: 'LAPTOP_LCD' },
      { id: 'MONITOR_LCD_PANEL', code: 'MONITOR_LCD' },
      { id: 'TV_LCD_PANEL', code: 'TV_LCD' },
    ],
  },
  [MATERIAL_CATEGORIES.PCB]: {
    id: MATERIAL_CATEGORIES.PCB,
    code: 'PCB',
    icon: 'memory',
    symbol: '🟢',
    subcategories: [
      { id: 'COMPUTER_MOTHERBOARD', code: 'MOTHERBOARD' },
      { id: 'TELECOM_BOARD', code: 'TELECOM' },
      { id: 'POWER_SUPPLY_BOARD', code: 'POWER_SUPPLY' },
      { id: 'LOW_GRADE_ELECTRONICS_BOARD', code: 'LOW_GRADE' },
    ],
  },
  [MATERIAL_CATEGORIES.CABLE]: {
    id: MATERIAL_CATEGORIES.CABLE,
    code: 'CABLE',
    icon: 'cable-data',
    symbol: '🔌',
    subcategories: [
      { id: 'COPPER_INSULATED_CABLE', code: 'COPPER_CABLE' },
      { id: 'ALUMINUM_CABLE', code: 'ALUMINUM_CABLE' },
      { id: 'POWER_CORD', code: 'POWER_CORD' },
      { id: 'CHARGING_DATA_CABLE', code: 'DATA_CABLE' },
    ],
  },
  [MATERIAL_CATEGORIES.BATTERY]: {
    id: MATERIAL_CATEGORIES.BATTERY,
    code: 'BATTERY',
    icon: 'battery-high',
    symbol: '🔋',
    subcategories: [
      { id: 'LITHIUM_ION_MOBILE_LAPTOP', code: 'LI_ION' },
      { id: 'LEAD_ACID_UPS', code: 'LEAD_ACID' },
      { id: 'NICKEL_CADMIUM_METAL_HYDRIDE', code: 'NICD_NIMH' },
    ],
  },
  [MATERIAL_CATEGORIES.MOTOR]: {
    id: MATERIAL_CATEGORIES.MOTOR,
    code: 'MOTOR',
    icon: 'fan',
    symbol: '⚙️',
    subcategories: [
      { id: 'COPPER_WOUND_APPLIANCE_MOTOR', code: 'COPPER_MOTOR' },
      { id: 'SMALL_DC_VIBRATION_MOTOR', code: 'DC_MOTOR' },
      { id: 'FAN_BLOWER_MOTOR', code: 'FAN_MOTOR' },
    ],
  },
  [MATERIAL_CATEGORIES.MAGNET_ASSEMBLY]: {
    id: MATERIAL_CATEGORIES.MAGNET_ASSEMBLY,
    code: 'MAGNET_ASSEMBLY',
    icon: 'magnet',
    symbol: '🧲',
    subcategories: [
      { id: 'HARD_DRIVE_NEODYMIUM_MAGNET', code: 'HDD_NEODYMIUM' },
      { id: 'SPEAKER_MAGNET_ASSEMBLY', code: 'SPEAKER_MAGNET' },
      { id: 'MOTOR_ROTOR_MAGNET', code: 'ROTOR_MAGNET' },
    ],
  },
  [MATERIAL_CATEGORIES.MIXED_PLASTIC]: {
    id: MATERIAL_CATEGORIES.MIXED_PLASTIC,
    code: 'MIXED_PLASTIC',
    icon: 'recycle',
    symbol: '♻️',
    subcategories: [
      { id: 'ABS_DEVICE_HOUSING', code: 'ABS_HOUSING' },
      { id: 'POLYCARBONATE_CASING', code: 'POLYCARBONATE' },
      { id: 'SHREDDED_MIXED_EWASTE_PLASTIC', code: 'MIXED_SHRED' },
    ],
  },
  [MATERIAL_CATEGORIES.MOBILE_PHONE]: {
    id: MATERIAL_CATEGORIES.MOBILE_PHONE,
    code: 'MOBILE_PHONE',
    icon: 'cellphone',
    symbol: '📱',
    subcategories: [
      { id: 'SMARTPHONE_TOUCHSCREEN', code: 'SMARTPHONE' },
      { id: 'FEATURE_PHONE_KEYPAD', code: 'FEATURE_PHONE' },
      { id: 'DAMAGED_SCRAP_PHONE', code: 'SCRAP_PHONE' },
    ],
  },
  [MATERIAL_CATEGORIES.LAPTOP]: {
    id: MATERIAL_CATEGORIES.LAPTOP,
    code: 'LAPTOP',
    icon: 'laptop',
    symbol: '💻',
    subcategories: [
      { id: 'COMPLETE_LAPTOP', code: 'COMPLETE_LAPTOP' },
      { id: 'DAMAGED_PARTIAL_LAPTOP', code: 'DAMAGED_LAPTOP' },
      { id: 'LAPTOP_CHASSIS_BODY', code: 'LAPTOP_SHELL' },
    ],
  },
  [MATERIAL_CATEGORIES.MONITOR]: {
    id: MATERIAL_CATEGORIES.MONITOR,
    code: 'MONITOR',
    icon: 'monitor',
    symbol: '🖥️',
    subcategories: [
      { id: 'LED_LCD_COMPUTER_MONITOR', code: 'LCD_MONITOR' },
      { id: 'CRT_COMPUTER_MONITOR', code: 'CRT_MONITOR' },
    ],
  },
  [MATERIAL_CATEGORIES.PRINTER]: {
    id: MATERIAL_CATEGORIES.PRINTER,
    code: 'PRINTER',
    icon: 'printer',
    symbol: '🖨️',
    subcategories: [
      { id: 'INKJET_PRINTER', code: 'INKJET' },
      { id: 'LASER_PRINTER', code: 'LASER' },
      { id: 'SCANNER_MULTIFUNCTION_PRINTER', code: 'MFP_SCANNER' },
    ],
  },
  [MATERIAL_CATEGORIES.KEYBOARD_MOUSE]: {
    id: MATERIAL_CATEGORIES.KEYBOARD_MOUSE,
    code: 'KEYBOARD_MOUSE',
    icon: 'keyboard',
    symbol: '⌨️',
    subcategories: [
      { id: 'MEMBRANE_KEYBOARD', code: 'MEMBRANE_KEYBOARD' },
      { id: 'MECHANICAL_KEYBOARD', code: 'MECHANICAL_KEYBOARD' },
      { id: 'OPTICAL_MOUSE', code: 'OPTICAL_MOUSE' },
    ],
  },
  [MATERIAL_CATEGORIES.DESKTOP_COMPUTER]: {
    id: MATERIAL_CATEGORIES.DESKTOP_COMPUTER,
    code: 'DESKTOP_COMPUTER',
    icon: 'desktop-tower',
    symbol: '🗄️',
    subcategories: [
      { id: 'FULL_TOWER_DESKTOP', code: 'FULL_TOWER' },
      { id: 'SLIM_MINI_PC', code: 'MINI_PC' },
      { id: 'SERVER_CHASSIS', code: 'SERVER' },
    ],
  },
  [MATERIAL_CATEGORIES.TABLET]: {
    id: MATERIAL_CATEGORIES.TABLET,
    code: 'TABLET',
    icon: 'tablet',
    symbol: '📲',
    subcategories: [
      { id: 'ANDROID_TABLET', code: 'ANDROID_TABLET' },
      { id: 'APPLE_IPAD', code: 'IPAD' },
      { id: 'E_BOOK_READER', code: 'E_READER' },
    ],
  },
  [MATERIAL_CATEGORIES.OTHER]: {
    id: MATERIAL_CATEGORIES.OTHER,
    code: 'OTHER',
    icon: 'shape-outline',
    symbol: '📦',
    subcategories: [
      { id: 'MISCELLANEOUS_SMALL_APPLIANCE', code: 'SMALL_APPLIANCE' },
      { id: 'MISCELLANEOUS_SCRAP', code: 'MISC_SCRAP' },
    ],
  },
});

function isValidCategory(category) {
  return Boolean(MATERIAL_TAXONOMY[category]);
}

function isValidSubcategory(category, subcategory) {
  if (!isValidCategory(category)) return false;
  const def = MATERIAL_TAXONOMY[category];
  if (!subcategory) return true;
  return def.subcategories.some(
    (s) => s.id === subcategory || s.code === subcategory || s.id.toLowerCase() === subcategory.toLowerCase() || subcategory.toLowerCase().includes(s.code.toLowerCase())
  );
}

module.exports = {
  MATERIAL_TAXONOMY,
  isValidCategory,
  isValidSubcategory,
};
