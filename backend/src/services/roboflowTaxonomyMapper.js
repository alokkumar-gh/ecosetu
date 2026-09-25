// EcoSetu Roboflow v43 (77-Class) to Canonical E-Waste Taxonomy Mapper
// Canonical Reference: docs/ECOSETU_AI_ROBOFLOW_STEP1_EVALUATION_REPORT.md, docs/05_API_SPECIFICATION.md Section 11

const { EWASTE_CATEGORIES } = require('../utils/constants');

/**
 * Priority tiers for deterministic multi-detection conflict resolution:
 * Tier 1 (COMPLETE_DEVICE): Whole finished devices / chassis. Highest resolution priority.
 * Tier 2 (PERIPHERAL_ASSEMBLY): External peripherals & standalone secondary units.
 * Tier 3 (INTERNAL_COMPONENT): Modular subcomponents, internal boards, bare cells, power cords.
 */
const PRIORITY_TIERS = {
  COMPLETE_DEVICE: 1,
  PERIPHERAL_ASSEMBLY: 2,
  INTERNAL_COMPONENT: 3,
};

/**
 * Authoritative mapping for all 77 Roboflow classes (e-waste-dataset-r0ojc/43)
 */
const ROBOFLOW_CLASS_MAP = {
  // ── Computing & Mobile Devices ──
  'Smartphone': {
    category: EWASTE_CATEGORIES.MOBILE_PHONE,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Touchscreen smartphone handset',
  },
  'Bar-Phone': {
    category: EWASTE_CATEGORIES.MOBILE_PHONE,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Feature phone / button mobile device',
  },
  'Tablet': {
    category: EWASTE_CATEGORIES.TABLET,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Touchscreen tablet computer',
  },
  'Laptop': {
    category: EWASTE_CATEGORIES.LAPTOP,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Portable laptop computer',
  },
  'Desktop-PC': {
    category: EWASTE_CATEGORIES.DESKTOP_COMPUTER || 'DESKTOP_COMPUTER',
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Desktop PC tower / chassis',
  },
  'Server': {
    category: EWASTE_CATEGORIES.DESKTOP_COMPUTER || 'DESKTOP_COMPUTER',
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'NEEDS_REVIEW',
    description: 'Enterprise rack/tower server chassis',
  },
  'PlayStation-5': {
    category: EWASTE_CATEGORIES.DESKTOP_COMPUTER || 'DESKTOP_COMPUTER',
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'NEEDS_REVIEW',
    description: 'Gaming console chassis (high-grade motherboard & APU)',
  },
  'Xbox-Series-X': {
    category: EWASTE_CATEGORIES.DESKTOP_COMPUTER || 'DESKTOP_COMPUTER',
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'NEEDS_REVIEW',
    description: 'Gaming console chassis (high-grade motherboard & APU)',
  },
  'Smart-Watch': {
    category: EWASTE_CATEGORIES.MOBILE_PHONE,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'NEEDS_REVIEW',
    description: 'Wearable digital mobile device',
  },

  // ── Peripherals & Input Devices ──
  'Computer-Keyboard': {
    category: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Mechanical / membrane computer keyboard',
  },
  'Computer-Mouse': {
    category: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Optical / trackball computer mouse',
  },
  'Printer': {
    category: EWASTE_CATEGORIES.PRINTER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Inkjet / laser desktop printer scanner',
  },
  'Router': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Networking Wi-Fi router / modem',
  },
  'Network-Switch': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'NEEDS_REVIEW',
    description: 'Enterprise ethernet network switch',
  },
  'TV-Remote-Control': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Infrared remote control unit',
  },

  // ── Displays & Visual ──
  'Flat-Panel-Monitor': {
    category: EWASTE_CATEGORIES.MONITOR,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Standalone LCD / LED / OLED computer monitor',
  },
  'Flat-Panel-TV': {
    category: EWASTE_CATEGORIES.MONITOR,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Flat panel television display',
  },
  'CRT-Monitor': {
    category: EWASTE_CATEGORIES.MONITOR,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Cathode ray tube monitor (leaded glass)',
  },
  'CRT-TV': {
    category: EWASTE_CATEGORIES.MONITOR,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Cathode ray tube television',
  },
  'Projector': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Digital video / optical projector',
  },

  // ── Components, Storage & Wiring ──
  'PCB': {
    category: EWASTE_CATEGORIES.CIRCUIT_BOARD || 'CIRCUIT_BOARD',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'Printed circuit board populated/unpopulated',
  },
  'Battery': {
    category: EWASTE_CATEGORIES.BATTERY,
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'Rechargeable Li-ion / Lead-acid / Dry cell battery',
  },
  'Power-Adapter': {
    category: EWASTE_CATEGORIES.CABLE_CHARGER || 'CABLE_CHARGER',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'AC/DC charging brick & power cord',
  },
  'Christmas-Lights': {
    category: EWASTE_CATEGORIES.CABLE_CHARGER || 'CABLE_CHARGER',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'Decorative multi-strand copper wiring',
  },
  'HDD': {
    category: EWASTE_CATEGORIES.CIRCUIT_BOARD || 'CIRCUIT_BOARD',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'NEEDS_REVIEW',
    description: 'Hard disk drive (rare-earth magnets + PCB board)',
  },
  'SSD': {
    category: EWASTE_CATEGORIES.CIRCUIT_BOARD || 'CIRCUIT_BOARD',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'Solid state flash memory board',
  },
  'USB-Flash-Drive': {
    category: EWASTE_CATEGORIES.CIRCUIT_BOARD || 'CIRCUIT_BOARD',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'USB thumb drive memory storage',
  },

  // ── Audio & Consumer Optical ──
  'Headphone': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Over-ear / on-ear audio headphones',
  },
  'Speaker': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Acoustic loudspeaker / bluetooth speaker',
  },
  'Camera': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Digital / analog camera',
  },
  'Music-Player': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'MP3 / portable media player',
  },
  'Electronic-Keyboard': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electronic music synthesizer keyboard',
  },
  'Electric-Guitar': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric musical guitar with pickups',
  },
  'Telephone-Set': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Landline telephone handset',
  },
  'Calculator': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electronic desktop calculator',
  },

  // ── Domestic Appliances & Motorized E-Waste ──
  'Ceiling-Fan': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Ceiling fan with copper-wound motor stator',
  },
  'Floor-Fan': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Pedestal electric fan motor',
  },
  'Exhaust-Fan': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Ventilation exhaust fan motor',
  },
  'Range-Hood': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Kitchen exhaust range hood',
  },
  'Vacuum-Cleaner': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Suction vacuum cleaner universal motor',
  },
  'Washing-Machine': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Household washing machine motor & chassis',
  },
  'Tumble-Dryer': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Clothes dryer appliance',
  },
  'Air-Conditioner': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'AC compressor unit & cooling system',
  },
  'Refrigerator': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Domestic refrigerator compressor',
  },
  'Freezer': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Deep freezer refrigeration appliance',
  },
  'Microwave': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Microwave oven (transformer + magnetron)',
  },
  'Oven': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric thermal oven',
  },
  'Stove': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric / induction cooktop',
  },
  'Dishwasher': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Dishwashing automated appliance',
  },
  'Coffee-Machine': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric coffee brewer',
  },
  'Toaster': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Bread toaster heating appliance',
  },
  'Clothes-Iron': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Steam / dry clothes iron',
  },
  'Hair-Dryer': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Hair blower motor',
  },
  'Dehumidifier': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Air dehumidifier condenser unit',
  },
  'Boiler': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric water heater / boiler',
  },
  'Rotary-Mower': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric rotary lawnmower motor',
  },
  'Electric-Bicycle': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'NEEDS_REVIEW',
    description: 'E-bike hub motor + high-capacity battery',
  },
  'Drone': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Unmanned aerial vehicle drone',
  },
  'Cooled-Dispenser': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Refrigerated beverage dispenser',
  },
  'Non-Cooled-Dispenser': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric water dispenser',
  },
  'Cooling-Display': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Commercial refrigerated showcase',
  },

  // ── Lighting & Industrial / Medical E-Waste ──
  'Compact-Fluorescent-Lamps': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'CFL bulb containing mercury',
  },
  'Straight-Tube-Fluorescent-Lamp': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Linear fluorescent tube',
  },
  'LED-Bulb': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Solid-state LED lighting',
  },
  'Table-Lamp': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electric desk luminaire',
  },
  'Street-Lamp': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Municipal street luminaire fixture',
  },
  'Neon-Sign': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'High-voltage gas neon sign',
  },
  'Flashlight': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Portable battery-operated torch',
  },
  'Photovoltaic-Panel': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Solar photovoltaic panel module',
  },
  'Blood-Pressure-Monitor': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electronic digital sphygmomanometer',
  },
  'Digital-Oscilloscope': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electronic test measurement oscilloscope',
  },
  'Electrocardiograph-Machine': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'ECG clinical diagnostic machine',
  },
  'Glucose-Meter': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Blood glucose monitoring meter',
  },
  'Patient-Monitoring-System': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Hospital multiparameter patient monitor',
  },
  'Pulse-Oximeter': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Digital pulse oximetry probe',
  },
  'Smoke-Detector': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electronic smoke/fire sensor alarm',
  },
  'Soldering-Iron': {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Electronic soldering station / iron',
  },

  // ── Synonyms & Common Aliases (for robust matching) ──
  'Monitor': {
    category: EWASTE_CATEGORIES.MONITOR,
    tier: PRIORITY_TIERS.COMPLETE_DEVICE,
    status: 'DIRECT',
    description: 'Computer display monitor (alias)',
  },
  'Keyboard': {
    category: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Computer keyboard (alias)',
  },
  'Mouse': {
    category: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
    tier: PRIORITY_TIERS.PERIPHERAL_ASSEMBLY,
    status: 'DIRECT',
    description: 'Computer mouse (alias)',
  },
  'Cable': {
    category: EWASTE_CATEGORIES.CABLE_CHARGER || 'CABLE_CHARGER',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'Power/Data cable (alias)',
  },
  'Circuit-Board': {
    category: EWASTE_CATEGORIES.CIRCUIT_BOARD || 'CIRCUIT_BOARD',
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'DIRECT',
    description: 'Printed circuit board (alias)',
  },
};

/**
 * Map a raw Roboflow class name to canonical EcoSetu category and metadata.
 * @param {string} className - Exact class name from Roboflow model
 * @returns {object} Mapping object { category, tier, status, className }
 */
function mapRoboflowClass(className) {
  if (!className || typeof className !== 'string') {
    return {
      category: EWASTE_CATEGORIES.OTHER,
      tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
      status: 'UNKNOWN',
      className: 'UNKNOWN',
    };
  }

  const entry = ROBOFLOW_CLASS_MAP[className];
  if (entry) {
    return {
      category: entry.category,
      tier: entry.tier,
      status: entry.status,
      className,
      description: entry.description,
    };
  }

  // Fallback for unmapped or dynamic classes
  return {
    category: EWASTE_CATEGORIES.OTHER,
    tier: PRIORITY_TIERS.INTERNAL_COMPONENT,
    status: 'UNMAPPED',
    className,
  };
}

/**
 * Select the authoritative primary detection from a list of normalized detections.
 * Applies container/macro-device prioritization rules before confidence comparison.
 * @param {Array<object>} detections - List of normalized detection items
 * @returns {object|null} Selected primary detection or null if empty
 */
function prioritizeDetections(detections) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return null;
  }

  if (detections.length === 1) {
    return detections[0];
  }

  // Sort by Priority Tier (Tier 1 COMPLETE_DEVICE comes first), then by Confidence descending
  const sorted = [...detections].sort((a, b) => {
    const tierA = a.tier || PRIORITY_TIERS.INTERNAL_COMPONENT;
    const tierB = b.tier || PRIORITY_TIERS.INTERNAL_COMPONENT;

    if (tierA !== tierB) {
      return tierA - tierB; // Lower tier number = higher priority
    }

    // Same tier: higher confidence wins
    return (b.confidence || 0) - (a.confidence || 0);
  });

  return sorted[0];
}

module.exports = {
  PRIORITY_TIERS,
  ROBOFLOW_CLASS_MAP,
  mapRoboflowClass,
  prioritizeDetections,
};
