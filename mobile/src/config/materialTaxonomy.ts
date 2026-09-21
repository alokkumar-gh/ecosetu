/**
 * EcoSetu Mobile Material Taxonomy
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1
 * Pictorial-first category metadata for collectors (including low-literacy users).
 */

export interface MaterialSubcategory {
  id: string;
  code: string;
  i18nKey: string;
  defaultName: string;
}

export interface MaterialCategoryDef {
  id: string;
  code: string;
  symbol: string;
  iconName: string;
  color: string;
  accentColor: string;
  i18nKey: string;
  defaultName: string;
  subcategories: MaterialSubcategory[];
}

export const MATERIAL_TAXONOMY: Record<string, MaterialCategoryDef> = {
  CRT: {
    id: 'CRT',
    code: 'CRT',
    symbol: '📺',
    iconName: 'tv',
    color: '#0D9488',
    accentColor: '#14B8A6',
    i18nKey: 'materialLots.categories.CRT',
    defaultName: 'CRT Monitors & TVs',
    subcategories: [
      { id: 'COLOR_CRT', code: 'COLOR_CRT', i18nKey: 'materialLots.subcategories.COLOR_CRT', defaultName: 'Color CRT' },
      { id: 'BW_CRT', code: 'BW_CRT', i18nKey: 'materialLots.subcategories.BW_CRT', defaultName: 'B&W CRT' },
      { id: 'PICTURE_TUBE', code: 'PICTURE_TUBE', i18nKey: 'materialLots.subcategories.PICTURE_TUBE', defaultName: 'Picture Tube Only' },
    ],
  },
  LCD_PANEL: {
    id: 'LCD_PANEL',
    code: 'LCD_PANEL',
    symbol: '🖥️',
    iconName: 'desktop-windows',
    color: '#0284C7',
    accentColor: '#38BDF8',
    i18nKey: 'materialLots.categories.LCD_PANEL',
    defaultName: 'LCD / LED Panels',
    subcategories: [
      { id: 'LAPTOP_LCD', code: 'LAPTOP_LCD', i18nKey: 'materialLots.subcategories.LAPTOP_LCD', defaultName: 'Laptop Screen' },
      { id: 'MONITOR_LCD', code: 'MONITOR_LCD', i18nKey: 'materialLots.subcategories.MONITOR_LCD', defaultName: 'Monitor Panel' },
      { id: 'TV_LCD', code: 'TV_LCD', i18nKey: 'materialLots.subcategories.TV_LCD', defaultName: 'TV Panel' },
    ],
  },
  PCB: {
    id: 'PCB',
    code: 'PCB',
    symbol: '🟢',
    iconName: 'memory',
    color: '#059669',
    accentColor: '#10B981',
    i18nKey: 'materialLots.categories.PCB',
    defaultName: 'Circuit Boards (PCB)',
    subcategories: [
      { id: 'MOTHERBOARD', code: 'MOTHERBOARD', i18nKey: 'materialLots.subcategories.MOTHERBOARD', defaultName: 'Computer Motherboard' },
      { id: 'TELECOM', code: 'TELECOM', i18nKey: 'materialLots.subcategories.TELECOM', defaultName: 'Telecom / Server Board' },
      { id: 'POWER_SUPPLY', code: 'POWER_SUPPLY', i18nKey: 'materialLots.subcategories.POWER_SUPPLY', defaultName: 'Power Supply Board' },
      { id: 'LOW_GRADE', code: 'LOW_GRADE', i18nKey: 'materialLots.subcategories.LOW_GRADE', defaultName: 'Low-Grade Brown Board' },
    ],
  },
  CABLE: {
    id: 'CABLE',
    code: 'CABLE',
    symbol: '🔌',
    iconName: 'cable',
    color: '#EA580C',
    accentColor: '#FB923C',
    i18nKey: 'materialLots.categories.CABLE',
    defaultName: 'Cables & Wiring',
    subcategories: [
      { id: 'COPPER_CABLE', code: 'COPPER_CABLE', i18nKey: 'materialLots.subcategories.COPPER_CABLE', defaultName: 'Insulated Copper Wire' },
      { id: 'ALUMINUM_CABLE', code: 'ALUMINUM_CABLE', i18nKey: 'materialLots.subcategories.ALUMINUM_CABLE', defaultName: 'Aluminum Wire' },
      { id: 'POWER_CORD', code: 'POWER_CORD', i18nKey: 'materialLots.subcategories.POWER_CORD', defaultName: 'Heavy Power Cord' },
      { id: 'DATA_CABLE', code: 'DATA_CABLE', i18nKey: 'materialLots.subcategories.DATA_CABLE', defaultName: 'Data / Charger Cable' },
    ],
  },
  BATTERY: {
    id: 'BATTERY',
    code: 'BATTERY',
    symbol: '🔋',
    iconName: 'battery-charging-full',
    color: '#D97706',
    accentColor: '#FBBF24',
    i18nKey: 'materialLots.categories.BATTERY',
    defaultName: 'Batteries',
    subcategories: [
      { id: 'LI_ION', code: 'LI_ION', i18nKey: 'materialLots.subcategories.LI_ION', defaultName: 'Lithium-Ion (Mobile/Laptop)' },
      { id: 'LEAD_ACID', code: 'LEAD_ACID', i18nKey: 'materialLots.subcategories.LEAD_ACID', defaultName: 'Lead Acid (UPS/Inverter)' },
      { id: 'NICD_NIMH', code: 'NICD_NIMH', i18nKey: 'materialLots.subcategories.NICD_NIMH', defaultName: 'Ni-Cd / Ni-MH Small' },
    ],
  },
  MOTOR: {
    id: 'MOTOR',
    code: 'MOTOR',
    symbol: '⚙️',
    iconName: 'rotate-right',
    color: '#6366F1',
    accentColor: '#818CF8',
    i18nKey: 'materialLots.categories.MOTOR',
    defaultName: 'Motors & Coils',
    subcategories: [
      { id: 'COPPER_MOTOR', code: 'COPPER_MOTOR', i18nKey: 'materialLots.subcategories.COPPER_MOTOR', defaultName: 'Copper-Wound Motor' },
      { id: 'DC_MOTOR', code: 'DC_MOTOR', i18nKey: 'materialLots.subcategories.DC_MOTOR', defaultName: 'Small DC / Toy Motor' },
      { id: 'FAN_MOTOR', code: 'FAN_MOTOR', i18nKey: 'materialLots.subcategories.FAN_MOTOR', defaultName: 'Fan / Blower Motor' },
    ],
  },
  MAGNET_ASSEMBLY: {
    id: 'MAGNET_ASSEMBLY',
    code: 'MAGNET_ASSEMBLY',
    symbol: '🧲',
    iconName: 'magnet',
    color: '#DC2626',
    accentColor: '#F87171',
    i18nKey: 'materialLots.categories.MAGNET_ASSEMBLY',
    defaultName: 'Magnet Assemblies',
    subcategories: [
      { id: 'HDD_NEODYMIUM', code: 'HDD_NEODYMIUM', i18nKey: 'materialLots.subcategories.HDD_NEODYMIUM', defaultName: 'Hard Drive Neodymium' },
      { id: 'SPEAKER_MAGNET', code: 'SPEAKER_MAGNET', i18nKey: 'materialLots.subcategories.SPEAKER_MAGNET', defaultName: 'Speaker Ferrite / Neodymium' },
      { id: 'ROTOR_MAGNET', code: 'ROTOR_MAGNET', i18nKey: 'materialLots.subcategories.ROTOR_MAGNET', defaultName: 'Motor Rotor Magnet' },
    ],
  },
  MIXED_PLASTIC: {
    id: 'MIXED_PLASTIC',
    code: 'MIXED_PLASTIC',
    symbol: '♻️',
    iconName: 'layers',
    color: '#475569',
    accentColor: '#94A3B8',
    i18nKey: 'materialLots.categories.MIXED_PLASTIC',
    defaultName: 'Mixed E-Plastics',
    subcategories: [
      { id: 'ABS_HOUSING', code: 'ABS_HOUSING', i18nKey: 'materialLots.subcategories.ABS_HOUSING', defaultName: 'ABS Device Casing' },
      { id: 'POLYCARBONATE', code: 'POLYCARBONATE', i18nKey: 'materialLots.subcategories.POLYCARBONATE', defaultName: 'Polycarbonate Transparent' },
      { id: 'MIXED_SHRED', code: 'MIXED_SHRED', i18nKey: 'materialLots.subcategories.MIXED_SHRED', defaultName: 'Mixed Crushed / Shredded' },
    ],
  },
  MOBILE_PHONE: {
    id: 'MOBILE_PHONE',
    code: 'MOBILE_PHONE',
    symbol: '📱',
    iconName: 'smartphone',
    color: '#8B5CF6',
    accentColor: '#A78BFA',
    i18nKey: 'materialLots.categories.MOBILE_PHONE',
    defaultName: 'Mobile Phones',
    subcategories: [
      { id: 'SMARTPHONE', code: 'SMARTPHONE', i18nKey: 'materialLots.subcategories.SMARTPHONE', defaultName: 'Touch Smartphone' },
      { id: 'FEATURE_PHONE', code: 'FEATURE_PHONE', i18nKey: 'materialLots.subcategories.FEATURE_PHONE', defaultName: 'Keypad Feature Phone' },
      { id: 'SCRAP_PHONE', code: 'SCRAP_PHONE', i18nKey: 'materialLots.subcategories.SCRAP_PHONE', defaultName: 'Scrap / Broken Body' },
    ],
  },
  LAPTOP: {
    id: 'LAPTOP',
    code: 'LAPTOP',
    symbol: '💻',
    iconName: 'laptop',
    color: '#2563EB',
    accentColor: '#60A5FA',
    i18nKey: 'materialLots.categories.LAPTOP',
    defaultName: 'Laptops',
    subcategories: [
      { id: 'COMPLETE_LAPTOP', code: 'COMPLETE_LAPTOP', i18nKey: 'materialLots.subcategories.COMPLETE_LAPTOP', defaultName: 'Complete Laptop' },
      { id: 'DAMAGED_LAPTOP', code: 'DAMAGED_LAPTOP', i18nKey: 'materialLots.subcategories.DAMAGED_LAPTOP', defaultName: 'Damaged / Broken Parts' },
      { id: 'LAPTOP_SHELL', code: 'LAPTOP_SHELL', i18nKey: 'materialLots.subcategories.LAPTOP_SHELL', defaultName: 'Shell / Chassis Body' },
    ],
  },
  MONITOR: {
    id: 'MONITOR',
    code: 'MONITOR',
    symbol: '🖥️',
    iconName: 'tv',
    color: '#0891B2',
    accentColor: '#22D3EE',
    i18nKey: 'materialLots.categories.MONITOR',
    defaultName: 'Computer Monitors',
    subcategories: [
      { id: 'LCD_MONITOR', code: 'LCD_MONITOR', i18nKey: 'materialLots.subcategories.LCD_MONITOR', defaultName: 'LCD / LED Monitor' },
      { id: 'CRT_MONITOR', code: 'CRT_MONITOR', i18nKey: 'materialLots.subcategories.CRT_MONITOR', defaultName: 'CRT Monitor' },
    ],
  },
  PRINTER: {
    id: 'PRINTER',
    code: 'PRINTER',
    symbol: '🖨️',
    iconName: 'print',
    color: '#4B5563',
    accentColor: '#9CA3AF',
    i18nKey: 'materialLots.categories.PRINTER',
    defaultName: 'Printers & Scanners',
    subcategories: [
      { id: 'INKJET', code: 'INKJET', i18nKey: 'materialLots.subcategories.INKJET', defaultName: 'Inkjet Printer' },
      { id: 'LASER', code: 'LASER', i18nKey: 'materialLots.subcategories.LASER', defaultName: 'Laser Printer' },
      { id: 'MFP_SCANNER', code: 'MFP_SCANNER', i18nKey: 'materialLots.subcategories.MFP_SCANNER', defaultName: 'Multifunction / Scanner' },
    ],
  },
  KEYBOARD_MOUSE: {
    id: 'KEYBOARD_MOUSE',
    code: 'KEYBOARD_MOUSE',
    symbol: '⌨️',
    iconName: 'keyboard',
    color: '#64748B',
    accentColor: '#94A3B8',
    i18nKey: 'materialLots.categories.KEYBOARD_MOUSE',
    defaultName: 'Keyboards & Mice',
    subcategories: [
      { id: 'MEMBRANE_KEYBOARD', code: 'MEMBRANE_KEYBOARD', i18nKey: 'materialLots.subcategories.MEMBRANE_KEYBOARD', defaultName: 'Standard Keyboard' },
      { id: 'MECHANICAL_KEYBOARD', code: 'MECHANICAL_KEYBOARD', i18nKey: 'materialLots.subcategories.MECHANICAL_KEYBOARD', defaultName: 'Mechanical Keyboard' },
      { id: 'OPTICAL_MOUSE', code: 'OPTICAL_MOUSE', i18nKey: 'materialLots.subcategories.OPTICAL_MOUSE', defaultName: 'Mouse (Wired/Wireless)' },
    ],
  },
  DESKTOP_COMPUTER: {
    id: 'DESKTOP_COMPUTER',
    code: 'DESKTOP_COMPUTER',
    symbol: '🗄️',
    iconName: 'computer',
    color: '#334155',
    accentColor: '#64748B',
    i18nKey: 'materialLots.categories.DESKTOP_COMPUTER',
    defaultName: 'Desktop Computers',
    subcategories: [
      { id: 'FULL_TOWER', code: 'FULL_TOWER', i18nKey: 'materialLots.subcategories.FULL_TOWER', defaultName: 'Full Tower CPU Cabinet' },
      { id: 'MINI_PC', code: 'MINI_PC', i18nKey: 'materialLots.subcategories.MINI_PC', defaultName: 'Mini PC / Thin Client' },
      { id: 'SERVER', code: 'SERVER', i18nKey: 'materialLots.subcategories.SERVER', defaultName: 'Server Chassis' },
    ],
  },
  TABLET: {
    id: 'TABLET',
    code: 'TABLET',
    symbol: '📲',
    iconName: 'tablet',
    color: '#7C3AED',
    accentColor: '#C4B5FD',
    i18nKey: 'materialLots.categories.TABLET',
    defaultName: 'Tablets & E-Readers',
    subcategories: [
      { id: 'ANDROID_TABLET', code: 'ANDROID_TABLET', i18nKey: 'materialLots.subcategories.ANDROID_TABLET', defaultName: 'Android Tablet' },
      { id: 'IPAD', code: 'IPAD', i18nKey: 'materialLots.subcategories.IPAD', defaultName: 'Apple iPad' },
      { id: 'E_READER', code: 'E_READER', i18nKey: 'materialLots.subcategories.E_READER', defaultName: 'E-Book Reader' },
    ],
  },
};

export const MATERIAL_TAXONOMY_LIST = Object.values(MATERIAL_TAXONOMY);
