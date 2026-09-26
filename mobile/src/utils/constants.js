/**
 * EcoSetu Mobile Constants
 * Canonical roles, statuses, categories, storage keys, and API defaults
 * Source of Truth: docs/00_PROJECT_INDEX.md, docs/05_API_SPECIFICATION.md, docs/09_FRONTEND_ARCHITECTURE.md
 */

// User Roles
export const ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  INFORMAL_COLLECTOR: 'INFORMAL_COLLECTOR',
  RECYCLER: 'RECYCLER',
  ADMIN: 'ADMIN',
});

// E-Waste Categories
export const EWASTE_CATEGORIES = Object.freeze({
  MOBILE_PHONE: 'MOBILE_PHONE',
  LAPTOP: 'LAPTOP',
  DESKTOP: 'DESKTOP',
  TABLET: 'TABLET',
  MONITOR: 'MONITOR',
  PRINTER: 'PRINTER',
  KEYBOARD_MOUSE: 'KEYBOARD_MOUSE',
  CABLE_CHARGER: 'CABLE_CHARGER',
  BATTERY: 'BATTERY',
  CIRCUIT_BOARD: 'CIRCUIT_BOARD',
  OTHER: 'OTHER',
});

// Item Conditions
export const ITEM_CONDITIONS = Object.freeze({
  WORKING: 'WORKING',
  NOT_WORKING: 'NOT_WORKING',
  DAMAGED: 'DAMAGED',
  UNKNOWN: 'UNKNOWN',
});

// E-Waste Item Statuses (Canonical Prisma enum ItemStatus)
export const ITEM_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  COLLECTED: 'COLLECTED',
  CONSIGNED: 'CONSIGNED',
  RECYCLED: 'RECYCLED',
});

// Collection Request Statuses (Canonical Prisma enum RequestStatus)
export const REQUEST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  PICKED_UP: 'PICKED_UP',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

// Pickup Statuses (Canonical Prisma enum PickupStatus)
export const PICKUP_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

// Consignment Statuses (Canonical Prisma enum ConsignmentStatus)
export const CONSIGNMENT_STATUS = Object.freeze({
  CREATED: 'CREATED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PENDING: 'CREATED', // Backwards-compatible alias for legacy references
});

// Recycling Record Statuses (Canonical Prisma enum RecyclingStatus)
export const RECYCLING_STATUS = Object.freeze({
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
});

// Canonical Notification Types (docs/23_NOTIFICATION_SYSTEM.md Section 2, backend constants)
export const NOTIFICATION_TYPES = Object.freeze({
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  CONSIGNMENT_INCOMING: 'CONSIGNMENT_INCOMING',
  CONSIGNMENT_ACCEPTED: 'CONSIGNMENT_ACCEPTED',
  CONSIGNMENT_REJECTED: 'CONSIGNMENT_REJECTED',
  RECYCLING_COMPLETED: 'RECYCLING_COMPLETED',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED',
});

// Offline Queue Item Statuses
export const QUEUE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
  CONFLICT: 'CONFLICT',
});

// Offline Queue Action Types
export const QUEUE_ACTION_TYPES = Object.freeze({
  CREATE_EWASTE_ITEM: 'CREATE_EWASTE_ITEM',
  CREATE_REQUEST: 'CREATE_REQUEST',
  COMPLETE_PICKUP: 'COMPLETE_PICKUP',
  CREATE_CONSIGNMENT: 'CREATE_CONSIGNMENT',
  CREATE_MATERIAL_LOT: 'CREATE_MATERIAL_LOT',
  CREATE_MATERIAL_ITEM: 'CREATE_MATERIAL_ITEM',
  UPDATE_COLLECTOR_PROFILE: 'UPDATE_COLLECTOR_PROFILE',
});

// Persistent Storage Keys
export const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: '@ecosetu_token',
  REFRESH_TOKEN: '@ecosetu_refresh_token',
  USER_PROFILE: '@ecosetu_user',
  OFFLINE_QUEUE: '@ecosetu_offline_queue',
  CACHE_PREFIX: '@ecosetu_cache_',
  CACHE_ITEMS: '@ecosetu_cache_items',
  CACHE_REQUESTS: '@ecosetu_cache_requests',
  CACHE_PICKUPS: '@ecosetu_cache_pickups',
  CACHE_MATERIAL_LOTS: '@ecosetu_cache_material_lots',
  CACHE_MATERIAL_ITEMS: '@ecosetu_cache_material_items',
  CACHE_PRICES: '@ecosetu_cache_prices',
  CACHE_PRICES_TIMESTAMP: '@ecosetu_cache_prices_timestamp',
  CACHE_PRICE_HISTORY: '@ecosetu_cache_price_history',
  CACHE_PRICE_HISTORY_TIMESTAMP: '@ecosetu_cache_price_history_timestamp',
  CACHE_RECYCLER_MATCHES_PREFIX: '@ecosetu_cache_matches_',
  CACHE_RECYCLER_MATCHES_TIMESTAMP_PREFIX: '@ecosetu_cache_matches_ts_',
  CACHE_LOT_QUOTES_PREFIX: '@ecosetu_cache_quotes_',
  CACHE_LOT_QUOTES_TIMESTAMP_PREFIX: '@ecosetu_cache_quotes_ts_',
  CACHE_HANDOVER_PREFIX: '@ecosetu_cache_handover_',
  CACHE_HANDOVER_TIMESTAMP_PREFIX: '@ecosetu_cache_handover_ts_',
  CACHE_LOT_HANDOVERS_PREFIX: '@ecosetu_cache_lot_handovers_',
  CACHE_LOT_HANDOVERS_TIMESTAMP_PREFIX: '@ecosetu_cache_lot_handovers_ts_',
  LANGUAGE: '@ecosetu_language',
  VOICE_ASSISTANCE: '@ecosetu_voice_assistance',
  CAROUSEL_COMPLETED: '@ecosetu_carousel_completed',
});

// SIH 26229 Quote Statuses
export const QUOTE_STATUS = Object.freeze({
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

// SIH 26229 Handover Statuses
export const HANDOVER_STATUS = Object.freeze({
  PENDING_COLLECTOR: 'PENDING_COLLECTOR',
  COLLECTOR_CONFIRMED: 'COLLECTOR_CONFIRMED',
  RECYCLER_CONFIRMED: 'RECYCLER_CONFIRMED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
});


// SIH 26229 Pickup Availability
export const PICKUP_AVAILABILITY = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  UNKNOWN: 'UNKNOWN',
});

// SIH 26229 Match Status
export const MATCH_STATUS = Object.freeze({
  MATCHED: 'MATCHED',
  PARTIAL_MATCH: 'PARTIAL_MATCH',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
});

// SIH 26229 Price Units
export const PRICE_UNITS = Object.freeze({
  PER_KG: 'PER_KG',
  PER_UNIT: 'PER_UNIT',
  PER_LOT: 'PER_LOT',
});

// SIH 26229 Price Sources
export const PRICE_SOURCES = Object.freeze({
  ADMIN_VERIFIED: 'ADMIN_VERIFIED',
  RECYCLER_OFFER: 'RECYCLER_OFFER',
  IMPORTED_MARKET_DATA: 'IMPORTED_MARKET_DATA',
});

// SIH 26229 Price Statuses
export const PRICE_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  REJECTED: 'REJECTED',
});

// SIH 26229 Material Categories
export const MATERIAL_CATEGORIES = Object.freeze({
  CRT: 'CRT',
  LCD_PANEL: 'LCD_PANEL',
  PCB: 'PCB',
  CABLE: 'CABLE',
  BATTERY: 'BATTERY',
  MOTOR: 'MOTOR',
  MAGNET_ASSEMBLY: 'MAGNET_ASSEMBLY',
  MIXED_PLASTIC: 'MIXED_PLASTIC',
  MOBILE_PHONE: 'MOBILE_PHONE',
  LAPTOP: 'LAPTOP',
  MONITOR: 'MONITOR',
  PRINTER: 'PRINTER',
  KEYBOARD_MOUSE: 'KEYBOARD_MOUSE',
  DESKTOP_COMPUTER: 'DESKTOP_COMPUTER',
  TABLET: 'TABLET',
  OTHER: 'OTHER',
});

// SIH 26229 Material Source Types
export const MATERIAL_SOURCE_TYPES = Object.freeze({
  HOUSEHOLD: 'HOUSEHOLD',
  COMMERCIAL: 'COMMERCIAL',
  INDUSTRIAL: 'INDUSTRIAL',
  STREET: 'STREET',
  OTHER: 'OTHER',
});

// SIH 26229 Material Lot Statuses
export const MATERIAL_LOT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  QUOTED: 'QUOTED',
  ACCEPTED: 'ACCEPTED',
  HANDOVER_PENDING: 'HANDOVER_PENDING',
  COMPLETED: 'COMPLETED',
});


// Canonical Backend API URLs
export const PRODUCTION_API_BASE_URL = 'https://ecosetu-backend.onrender.com/api/v1';
export const LOCAL_DEV_API_BASE_URL = 'http://10.0.2.2:3001/api/v1';
export const LOCAL_FALLBACK_API_BASE_URL = 'http://localhost:3001/api/v1';
export const LAN_DEV_API_BASE_URL = 'http://10.242.155.183:3001/api/v1';

// Dynamic Base URL Resolution:
// 1. Explicit environment variable overrides: process.env.PRODUCTION_API_BASE_URL or process.env.API_BASE_URL
// 2. Production & default resolution: PRODUCTION_API_BASE_URL (https://ecosetu-backend.onrender.com/api/v1)
const envOverride =
  typeof process !== 'undefined' && process.env
    ? (process.env.PRODUCTION_API_BASE_URL || process.env.API_BASE_URL)
    : null;

const configuredBaseUrl = (
  (envOverride ? envOverride.trim().replace(/\/+$/, '') : null) ||
  PRODUCTION_API_BASE_URL
).replace(/\/+$/, '');

// Network and API Defaults
export const API_CONFIG = Object.freeze({
  DEFAULT_BASE_URL: configuredBaseUrl,
  PRODUCTION_BASE_URL: PRODUCTION_API_BASE_URL,
  LOCAL_DEV_BASE_URL: LOCAL_DEV_API_BASE_URL,
  FALLBACK_BASE_URL: PRODUCTION_API_BASE_URL,
  LAN_DEV_BASE_URL: LAN_DEV_API_BASE_URL,
  DEFAULT_TIMEOUT_MS: 15000,
  UPLOAD_TIMEOUT_MS: 130000,
  AI_TIMEOUT_MS: 130000,
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
});

// Canonical Address Types (Prisma enum AddressType)
export const ADDRESS_TYPES = Object.freeze({
  HOME: 'HOME',
  OFFICE: 'OFFICE',
  OTHER: 'OTHER',
});

// Recycler Authorization Statuses
export const RECYCLER_AUTHORIZATION_STATUS = Object.freeze({
  AUTHORIZED: 'AUTHORIZED',
  PROVISIONAL: 'PROVISIONAL',
  PENDING: 'PENDING',
  PENDING_REVIEW: 'PENDING_REVIEW', // Compatibility alias for PENDING
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
  INACTIVE: 'INACTIVE',
  REVOKED: 'REVOKED',
});

