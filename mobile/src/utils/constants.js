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

// E-Waste Item Statuses
export const ITEM_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  COLLECTED: 'COLLECTED',
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

// Consignment Statuses
export const CONSIGNMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
});

// Recycling Record Statuses
export const RECYCLING_STATUS = Object.freeze({
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
});

// Offline Queue Item Statuses
export const QUEUE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
});

// Offline Queue Action Types
export const QUEUE_ACTION_TYPES = Object.freeze({
  CREATE_EWASTE_ITEM: 'CREATE_EWASTE_ITEM',
  CREATE_REQUEST: 'CREATE_REQUEST',
  COMPLETE_PICKUP: 'COMPLETE_PICKUP',
  CREATE_CONSIGNMENT: 'CREATE_CONSIGNMENT',
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
});

// Dynamic Base URL Resolution (supports build-time/runtime environment variables):
// Priority: PRODUCTION_API_BASE_URL -> API_BASE_URL -> Android Emulator loopback default
const configuredBaseUrl =
  (typeof process !== 'undefined' && process.env && (process.env.PRODUCTION_API_BASE_URL || process.env.API_BASE_URL)) ||
  'http://10.0.2.2:3001/api/v1';

// Network and API Defaults
export const API_CONFIG = Object.freeze({
  DEFAULT_BASE_URL: configuredBaseUrl,
  FALLBACK_BASE_URL: 'http://localhost:3001/api/v1',
  DEFAULT_TIMEOUT_MS: 15000,
  UPLOAD_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
});
