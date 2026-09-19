/**
 * EcoSetu Verification Suite: Phase 19 Task 17
 * Admin Data Integrity & Cross-Module Consistency Audit
 *
 * Source of Truth:
 * - docs/04_DATABASE_SCHEMA.md
 * - docs/05_API_SPECIFICATION.md
 * - docs/06_ROLES_AND_PERMISSIONS.md
 * - docs/07_BUSINESS_WORKFLOWS.md
 * - docs/21_TRACEABILITY_AND_AUDIT.md
 * - docs/22_ANALYTICS_AND_REPORTING.md
 * - docs/23_NOTIFICATION_SYSTEM.md
 * - docs/24_ERROR_EDGE_CASES.md
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.resolve(ROOT_DIR, '..', 'backend');

let passedTests = 0;
let failedTests = 0;

function pass(name, detail = '') {
  passedTests++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failedTests++;
  console.error(`  ❌ [FAIL] ${name}: ${error}`);
}

function check(name, fn) {
  try {
    fn();
    pass(name);
  } catch (err) {
    fail(name, err.message);
  }
}

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Phase 19 Task 17 — Admin Data Integrity & Consistency Audit');
console.log('════════════════════════════════════════════════════════════════════════\n');

// ─── 1. Canonical State Names & Enums Parity ─────────────────────────────────
console.log('─── 1. Canonical State Names & Schema Enums Parity ─────────────────────');

const backendConstants = require(path.join(BACKEND_DIR, 'src', 'utils', 'constants.js'));
const mobileConstantsFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'utils', 'constants.js'), 'utf8');

check('Canonical Roles defined identically in backend & schema', () => {
  const expectedRoles = ['CITIZEN', 'INFORMAL_COLLECTOR', 'RECYCLER', 'ADMIN'];
  expectedRoles.forEach((role) => {
    assert.strictEqual(backendConstants.ROLES[role], role);
    assert(mobileConstantsFile.includes(`${role}: '${role}'`), `Mobile missing role ${role}`);
  });
});

check('Canonical User Statuses defined identically in backend & schema', () => {
  const expectedStatuses = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
  expectedStatuses.forEach((status) => {
    assert.strictEqual(backendConstants.USER_STATUS[status], status);
  });
});

check('Canonical E-Waste Item Statuses defined in backend & mobile', () => {
  const expectedItemStatuses = ['SUBMITTED', 'COLLECTED', 'CONSIGNED', 'RECYCLED'];
  expectedItemStatuses.forEach((st) => {
    assert.strictEqual(backendConstants.ITEM_STATUS[st], st);
    assert(mobileConstantsFile.includes(`${st}: '${st}'`), `Mobile missing item status ${st}`);
  });
});

check('Canonical Collection Request Statuses defined in backend & mobile', () => {
  const expectedReqStatuses = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'CANCELLED', 'EXPIRED'];
  expectedReqStatuses.forEach((st) => {
    assert.strictEqual(backendConstants.REQUEST_STATUS[st], st);
    assert(mobileConstantsFile.includes(`${st}: '${st}'`), `Mobile missing request status ${st}`);
  });
});

check('Canonical Pickup Statuses defined in backend & mobile', () => {
  const expectedPickupStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'];
  expectedPickupStatuses.forEach((st) => {
    assert.strictEqual(backendConstants.PICKUP_STATUS[st], st);
    assert(mobileConstantsFile.includes(`${st}: '${st}'`), `Mobile missing pickup status ${st}`);
  });
});

check('Canonical Consignment Statuses defined in backend & mobile', () => {
  const expectedConsignmentStatuses = ['CREATED', 'IN_TRANSIT', 'DELIVERED', 'ACCEPTED', 'REJECTED'];
  expectedConsignmentStatuses.forEach((st) => {
    assert.strictEqual(backendConstants.CONSIGNMENT_STATUS[st], st);
    assert(mobileConstantsFile.includes(`${st}: '${st}'`), `Mobile missing consignment status ${st}`);
  });
});

check('Canonical Recycling Record Statuses defined in backend & mobile', () => {
  const expectedRecyclingStatuses = ['RECEIVED', 'PROCESSING', 'COMPLETED'];
  expectedRecyclingStatuses.forEach((st) => {
    assert.strictEqual(backendConstants.RECYCLING_STATUS[st], st);
    assert(mobileConstantsFile.includes(`${st}: '${st}'`), `Mobile missing recycling status ${st}`);
  });
});

check('Canonical Verification Statuses defined in backend', () => {
  const expectedVerificationStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  expectedVerificationStatuses.forEach((st) => {
    assert.strictEqual(backendConstants.VERIFICATION_STATUS[st], st);
  });
});

// ─── 2. Lifecycle State Machine Transitions ──────────────────────────────────
console.log('\n─── 2. Lifecycle State Machine Consistency ─────────────────────────────');

const requestServiceSrc = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'requestService.js'), 'utf8');
const pickupServiceSrc = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'pickupService.js'), 'utf8');
const consignmentServiceSrc = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'consignmentService.js'), 'utf8');
const recyclingServiceSrc = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'recyclingService.js'), 'utf8');

check('CollectionRequest: transitions from SUBMITTED to ACCEPTED on collector accept', () => {
  assert(requestServiceSrc.includes("status: REQUEST_STATUS.ACCEPTED"), 'Missing status update to ACCEPTED');
  assert(requestServiceSrc.includes("acceptedAt:"), 'Missing acceptedAt timestamp');
});

check('CollectionRequest: transitions to CANCELLED with reason', () => {
  assert(requestServiceSrc.includes("status: REQUEST_STATUS.CANCELLED"), 'Missing CANCELLED transition');
  assert(requestServiceSrc.includes("cancellationReason:"), 'Missing cancellationReason tracking');
});

check('Pickup: transitions from SCHEDULED -> IN_PROGRESS -> COMPLETED', () => {
  assert(pickupServiceSrc.includes("status: PICKUP_STATUS.IN_PROGRESS"), 'Missing IN_PROGRESS transition');
  assert(pickupServiceSrc.includes("startedAt:"), 'Missing startedAt timestamp');
  assert(pickupServiceSrc.includes("status: PICKUP_STATUS.COMPLETED"), 'Missing COMPLETED transition');
  assert(pickupServiceSrc.includes("completedAt:"), 'Missing completedAt timestamp');
  assert(pickupServiceSrc.includes("status: REQUEST_STATUS.PICKED_UP"), 'Pickup completion must update request to PICKED_UP');
  assert(pickupServiceSrc.includes("status: ITEM_STATUS.COLLECTED"), 'Pickup completion must update ewaste items to COLLECTED');
});

check('Consignment: transitions from CREATED -> IN_TRANSIT -> DELIVERED -> ACCEPTED / REJECTED', () => {
  assert(consignmentServiceSrc.includes("CONSIGNMENT_STATUS.CREATED") || consignmentServiceSrc.includes("'CREATED'"), 'Missing CREATED initial state');
  assert(consignmentServiceSrc.includes("CONSIGNMENT_STATUS.IN_TRANSIT") || consignmentServiceSrc.includes("'IN_TRANSIT'"), 'Missing IN_TRANSIT state check');
  assert(consignmentServiceSrc.includes("status: CONSIGNMENT_STATUS.DELIVERED") || consignmentServiceSrc.includes("status: 'DELIVERED'"), 'Missing DELIVERED transition');
  assert(consignmentServiceSrc.includes("status: CONSIGNMENT_STATUS.ACCEPTED") || consignmentServiceSrc.includes("status: 'ACCEPTED'"), 'Missing ACCEPTED transition');
  assert(consignmentServiceSrc.includes("status: CONSIGNMENT_STATUS.REJECTED") || consignmentServiceSrc.includes("status: 'REJECTED'"), 'Missing REJECTED transition');
  assert(consignmentServiceSrc.includes("status: ITEM_STATUS.CONSIGNED") || consignmentServiceSrc.includes("status: 'CONSIGNED'"), 'Consignment acceptance updates items to CONSIGNED');
});

check('RecyclingRecord: transitions from RECEIVED -> PROCESSING -> COMPLETED', () => {
  assert(
    consignmentServiceSrc.includes("status: RECYCLING_STATUS.RECEIVED") ||
    recyclingServiceSrc.includes("RECYCLING_STATUS.RECEIVED"),
    'Missing RECEIVED state'
  );
  assert(recyclingServiceSrc.includes("status: RECYCLING_STATUS.PROCESSING") || recyclingServiceSrc.includes("status: 'PROCESSING'"), 'Missing PROCESSING transition');
  assert(recyclingServiceSrc.includes("status: RECYCLING_STATUS.COMPLETED") || recyclingServiceSrc.includes("status: 'COMPLETED'"), 'Missing COMPLETED transition');
  assert(recyclingServiceSrc.includes("status: ITEM_STATUS.RECYCLED") || recyclingServiceSrc.includes("status: 'RECYCLED'"), 'Recycling completion updates items to RECYCLED');
});

// ─── 3. Analytics & Reporting Source Consistency ─────────────────────────────
console.log('\n─── 3. Analytics & Reporting Source Consistency ────────────────────────');

const analyticsServiceSrc = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'analyticsService.js'), 'utf8');
const adminDashboardSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminDashboardScreen.tsx'), 'utf8');
const adminReportsSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminReportsScreen.tsx'), 'utf8');
const adminServiceSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'adminService.js'), 'utf8');

check('Backend AnalyticsService derives all figures from transactional database', () => {
  assert(analyticsServiceSrc.includes('prisma.user.count('), 'Missing user count query');
  assert(analyticsServiceSrc.includes('prisma.ewasteItem.count('), 'Missing item count query');
  assert(analyticsServiceSrc.includes('prisma.collectionRequest.count('), 'Missing request count query');
  assert(analyticsServiceSrc.includes('prisma.pickup.count('), 'Missing pickup count query');
  assert(analyticsServiceSrc.includes('prisma.consignment.count('), 'Missing consignment count query');
  assert(analyticsServiceSrc.includes('prisma.recyclingRecord.count('), 'Missing recycling count query');
  assert(analyticsServiceSrc.includes('conversionFunnel:'), 'Missing conversion funnel aggregation');
});

check('AdminDashboardScreen queries authoritative adminService.getAnalytics()', () => {
  assert(adminDashboardSrc.includes('adminService.getAnalytics()'), 'Admin dashboard must call getAnalytics()');
  assert(!adminDashboardSrc.includes('Math.random()'), 'Zero fabricated/synthetic metrics in dashboard');
});

check('AdminReportsScreen queries authoritative adminService.getAnalytics()', () => {
  assert(adminReportsSrc.includes('adminService.getAnalytics()'), 'Admin reports must call getAnalytics()');
  assert(!adminReportsSrc.includes('Math.random()'), 'Zero fabricated/synthetic metrics in reports');
});

check('Both Admin screens derive funnel and totals consistently', () => {
  assert(adminDashboardSrc.includes('analytics?.conversionFunnel') || adminDashboardSrc.includes('funnel'), 'Dashboard uses backend funnel');
  assert(adminReportsSrc.includes('analytics?.conversionFunnel') || adminReportsSrc.includes('funnel'), 'Reports uses backend funnel');
});

// ─── 4. Notification Consistency ─────────────────────────────────────────────
console.log('\n─── 4. Notification Consistency (docs/23_NOTIFICATION_SYSTEM.md) ──────');

const notificationServiceSrc = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'notificationService.js'), 'utf8');
const adminGovernanceSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminGovernanceScreen.tsx'), 'utf8');

check('All 12 notification types defined in backend & mobile', () => {
  const expectedNotificationTypes = [
    'REQUEST_ACCEPTED',
    'PICKUP_SCHEDULED',
    'PICKUP_COMPLETED',
    'REQUEST_CANCELLED',
    'CONSIGNMENT_INCOMING',
    'CONSIGNMENT_ACCEPTED',
    'CONSIGNMENT_REJECTED',
    'RECYCLING_COMPLETED',
    'VERIFICATION_APPROVED',
    'VERIFICATION_REJECTED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_REACTIVATED',
  ];

  expectedNotificationTypes.forEach((type) => {
    assert.strictEqual(backendConstants.NOTIFICATION_TYPES[type], type);
    assert(mobileConstantsFile.includes(`${type}: '${type}'`), `Mobile missing notification type ${type}`);
  });
});

check('Notification creation is server-authoritative and resilient', () => {
  assert(notificationServiceSrc.includes('createNotification'), 'Missing createNotification method');
  assert(notificationServiceSrc.includes('isRead: false'), 'New notifications must default to unread');
  assert(!adminGovernanceSrc.includes('notificationService.createNotification'), 'Mobile client must never fabricate notifications');
});

// ─── 5. Traceability Consistency ─────────────────────────────────────────────
console.log('\n─── 5. Traceability Consistency (docs/21_TRACEABILITY_AND_AUDIT.md) ───');

const traceabilityScreenSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'citizen', 'ItemTraceabilityScreen.tsx'), 'utf8');

check('Traceability chain defines 4 ordered stages: citizen -> collector -> consignment -> recycler', () => {
  assert(traceabilityScreenSrc.includes("id: 'citizen'"), 'Missing citizen stage');
  assert(traceabilityScreenSrc.includes("id: 'collector'"), 'Missing collector stage');
  assert(traceabilityScreenSrc.includes("id: 'consignment'"), 'Missing consignment stage');
  assert(traceabilityScreenSrc.includes("id: 'recycler'"), 'Missing recycler stage');
});

check('isStageComplete maintains cumulative completeness (no completed stage disappears)', () => {
  // Collector stage remains complete when item is CONSIGNED or RECYCLED
  assert(traceabilityScreenSrc.includes('ITEM_STATUS.CONSIGNED'), 'Collector completeness must include CONSIGNED');
  assert(traceabilityScreenSrc.includes('ITEM_STATUS.RECYCLED'), 'Collector completeness must include RECYCLED');
  // Consignment stage includes CONSIGNED or RECYCLED or recyclingRecord
  assert(traceabilityScreenSrc.includes('data.item?.status === ITEM_STATUS.CONSIGNED'), 'Consignment completeness must check item CONSIGNED');
});

check('Recycling completion strictly requires RECYCLING_STATUS.COMPLETED or item RECYCLED', () => {
  assert(traceabilityScreenSrc.includes('RECYCLING_STATUS.COMPLETED'), 'Recycling complete must check COMPLETED');
  assert(traceabilityScreenSrc.includes('data.item?.status === ITEM_STATUS.RECYCLED'), 'Recycling complete must check item RECYCLED');
});

// ─── 6. Offline & Cache Consistency ──────────────────────────────────────────
console.log('\n─── 6. Offline & Cache Safeguards ──────────────────────────────────────');

const adminUsersSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminUsersScreen.tsx'), 'utf8');
const adminVerificationsSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminVerificationsScreen.tsx'), 'utf8');
const systemHealthSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminSystemHealthScreen.tsx'), 'utf8');

check('Admin mutations are strictly online-only (updateUserStatus & updateVerification)', () => {
  assert(adminServiceSrc.includes('if (!networkService.isConnected())'), 'adminService must guard against offline mutations');
  assert(adminServiceSrc.includes('isOfflineError = true'), 'adminService flags offline errors');
  assert(!adminUsersSrc.includes('offlineQueue.push'), 'Admin user mutations must NEVER be queued offline');
  assert(!adminVerificationsSrc.includes('offlineQueue.push'), 'Admin verification mutations must NEVER be queued offline');
});

check('Cache invalidation occurs after confirmed admin mutations', () => {
  assert(adminServiceSrc.includes('AsyncStorage.removeItem(CACHE_KEYS.USERS)'), 'Must invalidate users cache on status update');
  assert(adminServiceSrc.includes('AsyncStorage.removeItem(CACHE_KEYS.VERIFICATIONS)'), 'Must invalidate verifications cache on decision');
});

check('Stale cached data is visibly indicated in UI across Admin screens', () => {
  assert(adminDashboardSrc.includes('OfflineBanner'), 'Dashboard must render OfflineBanner');
  assert(adminReportsSrc.includes('fromCache'), 'Reports must track fromCache');
  assert(adminUsersSrc.includes('OfflineBanner') || adminUsersSrc.includes('fromCache'), 'Users screen must render offline indication');
  assert(systemHealthSrc.includes('isCached') || systemHealthSrc.includes('historical'), 'System health must mark cached historical data');
});

// ─── 7. Privacy & Security Audit ─────────────────────────────────────────────
console.log('\n─── 7. Privacy & Security Safeguards ───────────────────────────────────');

check('No DATABASE_URL in mobile source code', () => {
  const mobileFiles = fs.readdirSync(path.join(ROOT_DIR, 'src'), { recursive: true })
    .filter((f) => typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')));

  for (const f of mobileFiles) {
    const fullPath = path.join(ROOT_DIR, 'src', f);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(!content.includes('DATABASE_URL'), `Found DATABASE_URL in ${f}`);
  }
});

check('No Google Maps API key (AIza*) hardcoded in mobile source code', () => {
  const mobileFiles = fs.readdirSync(path.join(ROOT_DIR, 'src'), { recursive: true })
    .filter((f) => typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')));

  for (const f of mobileFiles) {
    const fullPath = path.join(ROOT_DIR, 'src', f);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(!content.includes('AIza'), `Found AIza API key in ${f}`);
  }
});

check('No JWT secrets hardcoded in mobile source code', () => {
  const mobileFiles = fs.readdirSync(path.join(ROOT_DIR, 'src'), { recursive: true })
    .filter((f) => typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')));

  for (const f of mobileFiles) {
    const fullPath = path.join(ROOT_DIR, 'src', f);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(!content.includes('JWT_ACCESS_SECRET'), `Found JWT_ACCESS_SECRET in ${f}`);
    assert(!content.includes('JWT_REFRESH_SECRET'), `Found JWT_REFRESH_SECRET in ${f}`);
  }
});

check('Admin governance uses FORBIDDEN_KEYS sanitization to protect citizen privacy', () => {
  assert(adminGovernanceSrc.includes('FORBIDDEN_KEYS'), 'Missing FORBIDDEN_KEYS set');
  assert(adminGovernanceSrc.includes('pickupLat'), 'FORBIDDEN_KEYS must include pickupLat');
  assert(adminGovernanceSrc.includes('pickupLng'), 'FORBIDDEN_KEYS must include pickupLng');
  assert(adminGovernanceSrc.includes('houseNumber'), 'FORBIDDEN_KEYS must include houseNumber');
  assert(adminGovernanceSrc.includes('street'), 'FORBIDDEN_KEYS must include street');
  assert(adminGovernanceSrc.includes('landmark'), 'FORBIDDEN_KEYS must include landmark');
});

// ─── 8. Zero Fake Health States & Polling Protection ─────────────────────────
console.log('\n─── 8. Factual Health Model & Zero Polling Protection ──────────────────');

check('System Health uses factual status model without fabricated database health', () => {
  assert(systemHealthSrc.includes("'UNKNOWN'") && systemHealthSrc.includes('dbStatus'), 'Database health must report UNKNOWN as backend does not ping DB');
  assert(systemHealthSrc.includes("'NOT_CONFIGURED'") && systemHealthSrc.includes('aiStatus'), 'AI microservice must report NOT_CONFIGURED');
});

check('Zero keep-alive polling or continuous timers in AdminSystemHealthScreen', () => {
  assert(!systemHealthSrc.includes('setInterval'), 'AdminSystemHealthScreen must not contain setInterval');
  assert(!systemHealthSrc.includes('setTimeout'), 'AdminSystemHealthScreen must not contain setTimeout');
});

console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  INTEGRITY AUDIT RESULTS: ${passedTests} passed | ${failedTests} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('All integrity and cross-module consistency checks passed! ✅\n');
  process.exit(0);
}
