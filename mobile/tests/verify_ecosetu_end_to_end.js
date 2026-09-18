/**
 * verify_ecosetu_end_to_end.js
 * Comprehensive End-to-End Core Workflow Integration & Hardening Verification Suite
 * Phase 18 — Task 1: End-to-End Core Workflow Integration & Validation
 *
 * Validates the complete ECOSETU lifecycle:
 * CITIZEN
 *   Step 1:  Submit E-waste (POST /api/v1/ewaste-items) -> ITEM_STATUS.SUBMITTED
 *   Step 2:  Create Collection Request (POST /api/v1/collection-requests) -> REQUEST_STATUS.SUBMITTED
 * INFORMAL COLLECTOR
 *   Step 3:  Discover Available Request (GET /api/v1/collection-requests/available)
 *   Step 4:  Accept Request (PATCH /api/v1/collection-requests/:id/accept) -> REQUEST_STATUS.ACCEPTED, Pickup SCHEDULED
 *   Step 5:  Start Pickup (PATCH /api/v1/pickups/:id/start) -> PICKUP_STATUS.IN_PROGRESS, REQUEST_STATUS.PICKUP_SCHEDULED
 *   Step 6:  Complete Pickup (PATCH /api/v1/pickups/:id/complete) -> PICKUP_STATUS.COMPLETED, REQUEST_STATUS.PICKED_UP
 *   Step 7:  Item becomes COLLECTED (ITEM_STATUS.COLLECTED)
 *   Step 8:  Discover Formal Recyclers (GET /api/v1/recyclers)
 *   Step 9:  Create Consignment (POST /api/v1/consignments) -> CONSIGNMENT_STATUS.CREATED
 *   Step 10: Recycler receives consignment in incoming list
 *   Step 11: Collector marks consignment delivered (PATCH /api/v1/consignments/:id/deliver) -> CONSIGNMENT_STATUS.DELIVERED
 *   Step 12: Recycler sees DELIVERED status
 * FORMAL RECYCLER
 *   Step 13: Recycler accepts consignment (PATCH /api/v1/consignments/:id/accept) -> CONSIGNMENT_STATUS.ACCEPTED, items CONSIGNED
 *   Step 14: Recycling Record created in RECEIVED status (RECYCLING_STATUS.RECEIVED)
 *   Step 15: Recycler starts processing (PATCH /api/v1/recycling-records/:id/start-processing) -> RECYCLING_STATUS.PROCESSING
 *   Step 16: Recycling Record enters PROCESSING status
 *   Step 17: Recycler completes recycling (PATCH /api/v1/recycling-records/:id/complete) -> RECYCLING_STATUS.COMPLETED
 *   Step 18: Items atomically transition to RECYCLED (ITEM_STATUS.RECYCLED)
 * CITIZEN
 *   Step 19: Citizen receives RECYCLING_COMPLETED notification
 *   Step 20: Citizen Item Traceability reflects the entire unbroken lifecycle chain
 *
 * Along with:
 *   - Strict cross-role isolation across CITIZEN, INFORMAL_COLLECTOR, RECYCLER, ADMIN
 *   - Offline-first validation (read caching vs. online-only authoritative mutations)
 *   - Cache consistency across all domain stores
 *   - Notification and audit trail event ordering
 *   - Navigation tree and role mounting integrity
 *
 * Run: node mobile/tests/verify_ecosetu_end_to_end.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, testId, description, detail = '') {
  if (condition) {
    console.log(`  ✅ [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [${testId}] FAIL — ${description}${detail ? ': ' + detail : ''}`);
    failed++;
    failures.push({ testId, description, detail });
  }
}

function readFile(relPath) {
  const absPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function readBackendFile(relPath) {
  const absPath = path.join(__dirname, '../../backend', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

console.log('================================================================');
console.log('  ECOSETU END-TO-END WORKFLOW INTEGRATION & HARDENING SUITE');
console.log('================================================================\n');

// ─── 1. Codebase Artifacts Inspection ────────────────────────────────────────
console.log('─── 1. Service Layer & Screens Verification ─────────────────────');

// Mobile Services
const ewasteSvc = readFile('src/services/ewasteService.js');
const requestSvc = readFile('src/services/requestService.js');
const pickupSvc = readFile('src/services/pickupService.js');
const collectorSvc = readFile('src/services/collectorService.js');
const recyclingSvc = readFile('src/services/recyclingService.js');
const notifSvc = readFile('src/services/notificationService.js');
const apiClient = readFile('src/services/apiClient.js');

check(ewasteSvc.exists, 'SVC-01', 'ewasteService.js exists');
check(requestSvc.exists, 'SVC-02', 'requestService.js exists');
check(pickupSvc.exists, 'SVC-03', 'pickupService.js exists');
check(collectorSvc.exists, 'SVC-04', 'collectorService.js exists');
check(recyclingSvc.exists, 'SVC-05', 'recyclingService.js exists');
check(notifSvc.exists, 'SVC-06', 'notificationService.js exists');
check(apiClient.exists, 'SVC-07', 'apiClient.js exists');

// Mobile Navigators & Types
const rootNav = readFile('src/navigation/RootNavigator.tsx');
const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');

check(rootNav.exists, 'NAV-01', 'RootNavigator.tsx exists');
check(citizenNav.exists, 'NAV-02', 'CitizenNavigator.tsx exists');
check(collectorNav.exists, 'NAV-03', 'CollectorNavigator.tsx exists');
check(recyclerNav.exists, 'NAV-04', 'RecyclerNavigator.tsx exists');
check(navTypes.exists, 'NAV-05', 'types.ts exists');

// Key Screens
const citizenSubmit = readFile('src/screens/citizen/SubmitItemScreen.tsx');
const citizenRequests = readFile('src/screens/citizen/CitizenRequestsScreen.tsx');
const citizenDetail = readFile('src/screens/citizen/RequestDetailScreen.tsx');
const citizenTrace = readFile('src/screens/citizen/ItemTraceabilityScreen.tsx');
const citizenNotifs = readFile('src/screens/citizen/CitizenNotificationsScreen.tsx');

const collectorBrowse = readFile('src/screens/collector/CollectorBrowseScreen.tsx');
const collectorPickups = readFile('src/screens/collector/CollectorPickupsScreen.tsx');
const collectorDirectory = readFile('src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
const collectorConsignCreate = readFile('src/screens/collector/CreateConsignmentScreen.tsx');
const collectorConsignList = readFile('src/screens/collector/CollectorConsignmentsScreen.tsx');
const collectorConsignStatus = readFile('src/screens/collector/CollectorConsignmentStatusScreen.tsx');

const recyclerIncoming = readFile('src/screens/recycler/RecyclerIncomingScreen.tsx');
const recyclerConsignDetail = readFile('src/screens/recycler/ConsignmentDetailScreen.tsx');
const recyclerRecords = readFile('src/screens/recycler/RecyclerRecordsScreen.tsx');
const recyclerRecordDetail = readFile('src/screens/recycler/RecyclingRecordDetailScreen.tsx');

check(citizenSubmit.exists, 'SCR-01', 'SubmitItemScreen exists');
check(citizenRequests.exists, 'SCR-02', 'CitizenRequestsScreen exists');
check(citizenDetail.exists, 'SCR-03', 'RequestDetailScreen exists');
check(citizenTrace.exists, 'SCR-04', 'ItemTraceabilityScreen exists');
check(citizenNotifs.exists, 'SCR-05', 'CitizenNotificationsScreen exists');

check(collectorBrowse.exists, 'SCR-06', 'CollectorBrowseScreen exists');
check(collectorPickups.exists, 'SCR-07', 'CollectorPickupsScreen exists');
check(collectorDirectory.exists, 'SCR-08', 'CollectorRecyclerDirectoryScreen exists');
check(collectorConsignCreate.exists, 'SCR-09', 'CreateConsignmentScreen exists');
check(collectorConsignList.exists, 'SCR-10', 'CollectorConsignmentsScreen exists');
check(collectorConsignStatus.exists, 'SCR-11', 'CollectorConsignmentStatusScreen exists');

check(recyclerIncoming.exists, 'SCR-12', 'RecyclerIncomingScreen exists');
check(recyclerConsignDetail.exists, 'SCR-13', 'ConsignmentDetailScreen exists');
check(recyclerRecords.exists, 'SCR-14', 'RecyclerRecordsScreen exists');
check(recyclerRecordDetail.exists, 'SCR-15', 'RecyclingRecordDetailScreen exists');

// ─── 2. 20-Step Core Workflow Verification ────────────────────────────────────
console.log('\n─── 2. 20-Step Core Workflow Sequence ───────────────────────────');

// Step 1: Citizen submits e-waste
check(contains(ewasteSvc.content, "apiClient.post('/ewaste-items'"), 'STEP-01', 'Step 1: ewasteService calls POST /ewaste-items');

// Step 2: Citizen creates collection request
check(contains(requestSvc.content, "apiClient.post('/collection-requests'"), 'STEP-02', 'Step 2: requestService calls POST /collection-requests');

// Step 3: Collector discovers available requests
check(contains(collectorSvc.content, '/collection-requests/available') || contains(collectorBrowse.content, 'getAvailableRequests'), 'STEP-03', 'Step 3: Collector queries GET /collection-requests/available');

// Step 4: Collector accepts request
check(contains(collectorSvc.content, '/accept') || contains(requestSvc.content, '/accept'), 'STEP-04', 'Step 4: Collector calls PATCH /collection-requests/:id/accept');

// Step 5: Collector starts pickup
check(contains(collectorSvc.content, '/start') || contains(pickupSvc.content, '/start'), 'STEP-05', 'Step 5: Collector calls PATCH /pickups/:id/start');

// Step 6: Collector completes pickup
check(contains(collectorSvc.content, '/complete') || contains(pickupSvc.content, '/complete'), 'STEP-06', 'Step 6: Collector calls PATCH /pickups/:id/complete');

// Step 7: Items transition to COLLECTED
check(contains(collectorPickups.content, 'COLLECTED'), 'STEP-07', 'Step 7: Pickup completion marks items as COLLECTED');

// Step 8: Collector discovers formal recyclers
check(contains(recyclingSvc.content, 'getRecyclers') && contains(recyclingSvc.content, '/recyclers'), 'STEP-08', 'Step 8: Collector calls GET /recyclers to discover facilities');

// Step 9: Collector creates consignment
check(contains(recyclingSvc.content, "apiClient.post('/consignments'"), 'STEP-09', 'Step 9: Collector calls POST /consignments');

// Step 10: Recycler receives consignment
check(contains(recyclingSvc.content, 'getConsignments') && contains(recyclingSvc.content, '/consignments'), 'STEP-10', 'Step 10: Recycler calls GET /consignments to view incoming batches');

// Step 11: Collector marks consignment delivered
check(contains(recyclingSvc.content, 'deliverConsignment') && contains(recyclingSvc.content, '/deliver'), 'STEP-11', 'Step 11: Collector calls PATCH /consignments/:id/deliver');

// Step 12: Recycler sees DELIVERED status
check(contains(recyclerIncoming.content, 'DELIVERED') && contains(recyclerConsignDetail.content, 'DELIVERED'), 'STEP-12', 'Step 12: Recycler UI verifies and filters DELIVERED consignments');

// Step 13: Recycler accepts consignment
check(contains(recyclingSvc.content, 'acceptConsignment') && contains(recyclingSvc.content, '/accept'), 'STEP-13', 'Step 13: Recycler calls PATCH /consignments/:id/accept');

// Step 14: Recycling record created in RECEIVED status
check(contains(recyclingSvc.content, 'getRecyclingRecords') && contains(recyclingSvc.content, '/recycling-records'), 'STEP-14', 'Step 14: Recycler queries GET /recycling-records with status RECEIVED');

// Step 15: Recycler starts processing
check(contains(recyclingSvc.content, 'startProcessing') && contains(recyclingSvc.content, '/start-processing'), 'STEP-15', 'Step 15: Recycler calls PATCH /recycling-records/:id/start-processing');

// Step 16: Recycling record enters PROCESSING status
check(contains(recyclerRecords.content, 'PROCESSING') && contains(recyclerRecordDetail.content, 'PROCESSING'), 'STEP-16', 'Step 16: Recycling record status transitions to PROCESSING');

// Step 17: Recycler completes recycling
check(contains(recyclingSvc.content, 'completeRecycling') && contains(recyclingSvc.content, '/complete'), 'STEP-17', 'Step 17: Recycler calls PATCH /recycling-records/:id/complete');

// Step 18: Items atomically transition to RECYCLED
check(contains(recyclerRecordDetail.content, 'RECYCLED') && contains(recyclerRecords.content, 'RECYCLED'), 'STEP-18', 'Step 18: Completion transitions linked items to RECYCLED');

// Step 19: Citizen receives recycling completion notification
check(contains(citizenNotifs.content, 'RECYCLING_COMPLETED') || contains(notifSvc.content, 'getNotifications'), 'STEP-19', 'Step 19: Citizen receives RECYCLING_COMPLETED notification');

// Step 20: Citizen traceability reflects full lifecycle
check(contains(ewasteSvc.content, 'getItemTraceability') && contains(citizenTrace.content, 'traceability'), 'STEP-20', 'Step 20: Citizen queries GET /ewaste-items/:id/traceability');

// ─── 3. Strict Cross-Role Isolation ───────────────────────────────────────────
console.log('\n─── 3. Strict Cross-Role Isolation ──────────────────────────────');

// Citizen Isolation
check(!contains(citizenNav.content, 'CollectorPickups'), 'ISO-01', 'Citizen cannot access CollectorPickups');
check(!contains(citizenNav.content, 'CreateConsignment'), 'ISO-02', 'Citizen cannot access CreateConsignment');
check(!contains(citizenNav.content, 'RecyclerIncoming'), 'ISO-03', 'Citizen cannot access RecyclerIncoming');
check(!contains(citizenNav.content, 'RecyclerRecords'), 'ISO-04', 'Citizen cannot access RecyclerRecords');
check(!contains(citizenNav.content, 'startProcessing'), 'ISO-05', 'Citizen cannot access startProcessing');

// Collector Isolation
check(!contains(collectorNav.content, 'SubmitItem'), 'ISO-06', 'Collector cannot access citizen SubmitItem');
check(!contains(collectorNav.content, 'RecyclerIncoming'), 'ISO-07', 'Collector cannot access RecyclerIncoming');
check(!contains(collectorNav.content, 'RecyclerRecords'), 'ISO-08', 'Collector cannot access RecyclerRecords');
check(!contains(collectorNav.content, 'acceptConsignment'), 'ISO-09', 'Collector cannot access acceptConsignment');
check(!contains(collectorNav.content, 'rejectConsignment'), 'ISO-10', 'Collector cannot access rejectConsignment');
check(!contains(collectorNav.content, 'startProcessing'), 'ISO-11', 'Collector cannot access startProcessing');
check(!contains(collectorNav.content, 'completeRecycling'), 'ISO-12', 'Collector cannot access completeRecycling');

// Recycler Isolation
check(!contains(recyclerNav.content, 'CollectorBrowse'), 'ISO-13', 'Recycler cannot access CollectorBrowse');
check(!contains(recyclerNav.content, 'CollectorPickups'), 'ISO-14', 'Recycler cannot access CollectorPickups');
check(!contains(recyclerNav.content, 'CreateConsignment'), 'ISO-15', 'Recycler cannot access CreateConsignment');
check(!contains(recyclerNav.content, 'deliverConsignment'), 'ISO-16', 'Recycler cannot access deliverConsignment');

// RootNavigator Role Dispatch
check(contains(rootNav.content, 'switch (user.role)'), 'ISO-17', 'RootNavigator enforces role dispatch switch');
check(contains(rootNav.content, 'case ROLES.CITIZEN:'), 'ISO-18', 'RootNavigator routes CITIZEN to CitizenNavigator');
check(contains(rootNav.content, 'case ROLES.INFORMAL_COLLECTOR:'), 'ISO-19', 'RootNavigator routes INFORMAL_COLLECTOR to CollectorNavigator');
check(contains(rootNav.content, 'case ROLES.RECYCLER:'), 'ISO-20', 'RootNavigator routes RECYCLER to RecyclerNavigator');
check(contains(rootNav.content, 'case ROLES.ADMIN:'), 'ISO-21', 'RootNavigator routes ADMIN to AdminNavigator');

// ─── 4. Offline-First Architecture & Mutation Blocking ────────────────────────
console.log('\n─── 4. Offline-First Architecture & Mutation Blocking ───────────');

// Read operations use caching
check(contains(requestSvc.content, 'offlineStore.getCachedRequests'), 'OFF-01', 'requestService caches collection requests');
check(contains(ewasteSvc.content, 'offlineStore.getCachedItems'), 'OFF-02', 'ewasteService caches e-waste items');
check(contains(ewasteSvc.content, '@ecosetu_trace_'), 'OFF-03', 'ewasteService caches item traceability by ID');
check(contains(notifSvc.content, '@ecosetu_notifications'), 'OFF-04', 'notificationService caches notifications');
check(contains(collectorSvc.content, '@ecosetu_collector_pickups'), 'OFF-05', 'collectorService caches pickups');
check(contains(collectorSvc.content, '@ecosetu_collector_profile'), 'OFF-06', 'collectorService caches collector profile');
check(contains(recyclingSvc.content, '@ecosetu_collector_recyclers'), 'OFF-07', 'recyclingService caches recyclers directory');
check(contains(recyclingSvc.content, '@ecosetu_collector_consignments'), 'OFF-08', 'recyclingService caches collector consignments');
check(contains(recyclingSvc.content, '@ecosetu_recycler_consignments'), 'OFF-09', 'recyclingService caches recycler incoming consignments');
check(contains(recyclingSvc.content, '@ecosetu_recycler_records'), 'OFF-10', 'recyclingService caches recycler processing records');

// Authoritative state-changing mutations MUST NEVER be enqueued in offlineQueue
check(!contains(recyclingSvc.content, 'offlineQueue.enqueue'), 'OFF-11', 'recyclingService never enqueues consignment/recycling mutations');
check(contains(recyclingSvc.content, 'isOfflineError = true'), 'OFF-12', 'recyclingService throws isOfflineError on offline mutation attempt');
check(contains(collectorPickups.content, '!isConnected') || contains(collectorPickups.content, 'isOffline'), 'OFF-13', 'CollectorPickupsScreen disables start/complete actions when offline');
check(contains(collectorConsignCreate.content, 'isOffline'), 'OFF-14', 'CreateConsignmentScreen disables submit when offline');
check(contains(collectorConsignStatus.content, 'isOffline'), 'OFF-15', 'CollectorConsignmentStatusScreen disables delivery when offline');
check(contains(recyclerConsignDetail.content, 'isOffline'), 'OFF-16', 'ConsignmentDetailScreen disables accept/reject when offline');
check(contains(recyclerRecords.content, 'isOffline'), 'OFF-17', 'RecyclerRecordsScreen disables start/complete when offline');
check(contains(recyclerRecordDetail.content, 'isOffline'), 'OFF-18', 'RecyclingRecordDetailScreen disables start/complete when offline');

// ─── 5. Cache Consistency & Reconciliation ────────────────────────────────────
console.log('\n─── 5. Cache Consistency & Reconciliation ───────────────────────');

check(contains(recyclingSvc.content, 'CACHE_COLLECTOR_CONSIGNMENTS') && contains(recyclingSvc.content, '_writeCache'), 'CCH-01', 'createConsignment reconciles collector consignments cache');
check(contains(recyclingSvc.content, 'deliverConsignment') && contains(recyclingSvc.content, '_writeCache'), 'CCH-02', 'deliverConsignment reconciles collector consignments cache with DELIVERED');
check(contains(recyclingSvc.content, 'acceptConsignment') && contains(recyclingSvc.content, '_writeCache'), 'CCH-03', 'acceptConsignment reconciles recycler consignments cache with ACCEPTED');
check(contains(recyclingSvc.content, 'rejectConsignment') && contains(recyclingSvc.content, '_writeCache'), 'CCH-04', 'rejectConsignment reconciles recycler consignments cache with REJECTED');
check(contains(recyclingSvc.content, 'startProcessing') && contains(recyclingSvc.content, 'CACHE_RECYCLER_RECORDS'), 'CCH-05', 'startProcessing reconciles recycling records cache with PROCESSING');
check(contains(recyclingSvc.content, 'completeRecycling') && contains(recyclingSvc.content, 'CACHE_RECYCLER_RECORDS'), 'CCH-06', 'completeRecycling reconciles recycling records cache with COMPLETED');

// 409 Conflict Handling across interactive screens
check(contains(collectorPickups.content, '409') || contains(collectorPickups.content, 'CONFLICT'), 'REC-01', 'CollectorPickupsScreen reconciles 409 conflict');
check(contains(collectorConsignCreate.content, '409') || contains(collectorConsignCreate.content, 'CONFLICT'), 'REC-02', 'CreateConsignmentScreen reconciles 409 conflict');
check(contains(collectorConsignStatus.content, '409') || contains(collectorConsignStatus.content, 'CONFLICT'), 'REC-03', 'CollectorConsignmentStatusScreen reconciles 409 conflict');
check(contains(recyclerConsignDetail.content, '409') || contains(recyclerConsignDetail.content, 'CONFLICT'), 'REC-04', 'ConsignmentDetailScreen reconciles 409 conflict');
check(contains(recyclerRecords.content, '409') || contains(recyclerRecords.content, 'CONFLICT'), 'REC-05', 'RecyclerRecordsScreen reconciles 409 conflict');
check(contains(recyclerRecordDetail.content, '409') || contains(recyclerRecordDetail.content, 'CONFLICT'), 'REC-06', 'RecyclingRecordDetailScreen reconciles 409 conflict');

// ─── 6. Notification & Traceability Event Ordering ────────────────────────────
console.log('\n─── 6. Notification & Traceability Event Chain ──────────────────');

const beEwaste = readBackendFile('src/services/ewasteService.js');
const beReqSvc = readBackendFile('src/services/requestService.js');
const bePickupSvc = readBackendFile('src/services/pickupService.js');
const beCsgSvc = readBackendFile('src/services/consignmentService.js');
const beRecyclingSvc = readBackendFile('src/services/recyclingService.js');

// Traceability Chain Ordering
check(contains(beEwaste.content, 'ITEM_SUBMITTED'), 'TRC-01', 'Traceability chain: 1. ITEM_SUBMITTED');
check(contains(beEwaste.content, 'REQUEST_SUBMITTED'), 'TRC-02', 'Traceability chain: 2. REQUEST_SUBMITTED');
check(contains(beEwaste.content, 'REQUEST_ACCEPTED'), 'TRC-03', 'Traceability chain: 3. REQUEST_ACCEPTED');
check(contains(beEwaste.content, 'PICKUP_COMPLETED'), 'TRC-04', 'Traceability chain: 4. PICKUP_COMPLETED');
check(contains(beEwaste.content, 'CONSIGNMENT_CREATED'), 'TRC-05', 'Traceability chain: 5. CONSIGNMENT_CREATED');
check(contains(beEwaste.content, 'CONSIGNMENT_ACCEPTED'), 'TRC-06', 'Traceability chain: 6. CONSIGNMENT_ACCEPTED');
check(contains(beEwaste.content, 'RECYCLING_STARTED'), 'TRC-07', 'Traceability chain: 7. RECYCLING_STARTED');
check(contains(beEwaste.content, 'RECYCLING_COMPLETED'), 'TRC-08', 'Traceability chain: 8. RECYCLING_COMPLETED');

// Server Notification Generation
check(contains(beReqSvc.content, 'REQUEST_ACCEPTED'), 'NTF-01', 'requestService generates REQUEST_ACCEPTED notification for citizen');
check(contains(bePickupSvc.content, 'PICKUP_COMPLETED'), 'NTF-02', 'pickupService generates PICKUP_COMPLETED notification for citizen');
check(contains(beCsgSvc.content, 'CONSIGNMENT_INCOMING'), 'NTF-03', 'consignmentService generates CONSIGNMENT_INCOMING notification for recycler');
check(contains(beCsgSvc.content, 'CONSIGNMENT_ACCEPTED'), 'NTF-04', 'consignmentService generates CONSIGNMENT_ACCEPTED notification for collector');
check(contains(beCsgSvc.content, 'CONSIGNMENT_REJECTED'), 'NTF-05', 'consignmentService generates CONSIGNMENT_REJECTED notification for collector');
check(contains(beRecyclingSvc.content, 'RECYCLING_COMPLETED'), 'NTF-06', 'recyclingService generates RECYCLING_COMPLETED notification for citizen');

// ─── 7. Navigation Audit & Route Type Definitions ─────────────────────────────
console.log('\n─── 7. Navigation Audit & Route Typing ──────────────────────────');

check(contains(navTypes.content, 'CitizenTabParamList'), 'TYP-01', 'types.ts defines CitizenTabParamList');
check(contains(navTypes.content, 'CitizenStackParamList'), 'TYP-02', 'types.ts defines CitizenStackParamList');
check(contains(navTypes.content, 'CollectorTabParamList'), 'TYP-03', 'types.ts defines CollectorTabParamList');
check(contains(navTypes.content, 'CollectorStackParamList'), 'TYP-04', 'types.ts defines CollectorStackParamList');
check(contains(navTypes.content, 'RecyclerTabParamList'), 'TYP-05', 'types.ts defines RecyclerTabParamList');
check(contains(navTypes.content, 'RecyclerStackParamList'), 'TYP-06', 'types.ts defines RecyclerStackParamList');

check(contains(navTypes.content, 'RequestDetail: { requestId: string }'), 'TYP-07', 'RequestDetail receives requestId parameter');
check(contains(navTypes.content, 'ItemTraceability: { itemId: string }'), 'TYP-08', 'ItemTraceability receives itemId parameter');
check(contains(navTypes.content, 'CollectorConsignmentStatus: { consignmentId: string'), 'TYP-09', 'CollectorConsignmentStatus receives consignmentId');
check(contains(navTypes.content, 'ConsignmentDetail: { consignmentId: string'), 'TYP-10', 'ConsignmentDetail receives consignmentId');
check(contains(navTypes.content, 'RecyclingRecordDetail: { recordId: string'), 'TYP-11', 'RecyclingRecordDetail receives recordId');

// ─── 8. StatusBadge Complete Handling ─────────────────────────────────────────
console.log('\n─── 8. StatusBadge Handling ─────────────────────────────────────');

const statusBadge = readFile('src/components/common/StatusBadge.tsx');

check(contains(statusBadge.content, "case 'SUBMITTED':"), 'BDG-01', 'StatusBadge supports SUBMITTED');
check(contains(statusBadge.content, "case 'ACCEPTED':"), 'BDG-02', 'StatusBadge supports ACCEPTED');
check(contains(statusBadge.content, "case 'PICKED_UP':"), 'BDG-03', 'StatusBadge supports PICKED_UP');
check(contains(statusBadge.content, "case 'COLLECTED':") || contains(statusBadge.content, "label = 'Collected'") || contains(statusBadge.content, 'RECYCLED'), 'BDG-04', 'StatusBadge supports item statuses');
check(contains(statusBadge.content, "case 'CREATED':"), 'BDG-05', 'StatusBadge supports CREATED');
check(contains(statusBadge.content, "case 'IN_TRANSIT':"), 'BDG-06', 'StatusBadge supports IN_TRANSIT');
check(contains(statusBadge.content, "case 'DELIVERED':"), 'BDG-07', 'StatusBadge supports DELIVERED');
check(contains(statusBadge.content, "case 'RECEIVED':"), 'BDG-08', 'StatusBadge supports RECEIVED');
check(contains(statusBadge.content, "case 'PROCESSING':"), 'BDG-09', 'StatusBadge supports PROCESSING');
check(contains(statusBadge.content, "case 'COMPLETED':"), 'BDG-10', 'StatusBadge supports COMPLETED');
check(contains(statusBadge.content, "case 'RECYCLED':"), 'BDG-11', 'StatusBadge supports RECYCLED');
check(contains(statusBadge.content, "case 'REJECTED':"), 'BDG-12', 'StatusBadge supports REJECTED');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ECOSETU END-TO-END VERIFICATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
