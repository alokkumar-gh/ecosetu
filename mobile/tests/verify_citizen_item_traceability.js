/**
 * verify_citizen_item_traceability.js
 * Static verification suite for Phase 16 — Task 6: Citizen Item Traceability.
 *
 * Tests:
 *   A. Service layer — ewasteService.getItemTraceability
 *   B. Screen file — ItemTraceabilityScreen.tsx
 *   C. Navigator — CitizenNavigator.tsx wiring
 *   D. Business rules — ECOSETU chain of custody constraints
 *   E. Offline-first behaviour
 *
 * Run: node mobile/tests/verify_citizen_item_traceability.js
 */

const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testId, description, detail = '') {
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
  if (!fs.existsSync(absPath)) {
    return { exists: false, content: '' };
  }
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern, flags = '') {
  if (typeof pattern === 'string') {
    return content.includes(pattern);
  }
  return new RegExp(pattern, flags).test(content);
}

// ─── Load Subjects ─────────────────────────────────────────────────────────────

const service = readFile('src/services/ewasteService.js');
const screen  = readFile('src/screens/citizen/ItemTraceabilityScreen.tsx');
const nav     = readFile('src/navigation/CitizenNavigator.tsx');

// ─── A. Service Layer ─────────────────────────────────────────────────────────

console.log('\n─── A. Service Layer: ewasteService.js ───────────────────────────────────');

assert(service.exists, 'A01', 'ewasteService.js exists');

assert(
  contains(service.content, 'getItemTraceability'),
  'A02', 'getItemTraceability method defined',
);

assert(
  contains(service.content, '/ewaste-items/${itemId}/traceability'),
  'A03', 'Calls GET /ewaste-items/:id/traceability',
);

assert(
  contains(service.content, 'networkService.isConnected()'),
  'A04', 'Checks network connectivity before API call',
);

assert(
  contains(service.content, '@ecosetu_trace_'),
  'A05', 'Uses per-item cache key prefix @ecosetu_trace_',
);

assert(
  contains(service.content, 'AsyncStorage.setItem'),
  'A06', 'Persists traceability payload to AsyncStorage',
);

assert(
  contains(service.content, 'AsyncStorage.getItem'),
  'A07', 'Reads cached payload from AsyncStorage when offline',
);

assert(
  contains(service.content, 'isNetworkError'),
  'A08', 'Falls back to cache on network error',
);

assert(
  contains(service.content, '_getCachedTraceability'),
  'A09', '_getCachedTraceability helper method defined',
);

// ─── B. Screen File ────────────────────────────────────────────────────────────

console.log('\n─── B. Screen File: ItemTraceabilityScreen.tsx ───────────────────────────');

assert(screen.exists, 'B01', 'ItemTraceabilityScreen.tsx file exists');

assert(
  contains(screen.content, "export const ItemTraceabilityScreen"),
  'B02', 'Named export ItemTraceabilityScreen',
);

assert(
  contains(screen.content, "CitizenStackParamList, 'ItemTraceability'"),
  'B03', "Typed as CitizenStackParamList 'ItemTraceability' route",
);

assert(
  contains(screen.content, 'route.params'),
  'B04', 'Reads route.params for itemId',
);

assert(
  contains(screen.content, 'itemId'),
  'B05', 'Uses itemId from route params',
);

assert(
  contains(screen.content, 'ewasteService.getItemTraceability'),
  'B06', 'Calls ewasteService.getItemTraceability',
);

assert(
  contains(screen.content, 'isLoading'),
  'B07', 'Loading state managed',
);

assert(
  contains(screen.content, 'isRefreshing'),
  'B08', 'Pull-to-refresh state managed',
);

assert(
  contains(screen.content, 'RefreshControl'),
  'B09', 'RefreshControl implemented for pull-to-refresh',
);

assert(
  contains(screen.content, 'errorMessage'),
  'B10', 'Error state managed',
);

assert(
  contains(screen.content, 'Skeleton'),
  'B11', 'Skeleton loading placeholders used',
);

assert(
  contains(screen.content, 'OfflineBanner'),
  'B12', 'OfflineBanner displayed when offline',
);

assert(
  contains(screen.content, 'Chain of Custody'),
  'B13', 'Chain of Custody section rendered',
);

assert(
  contains(screen.content, 'Informal Collector (Kabadiwala)'),
  'B14', 'Informal Collector (Kabadiwala) label present — enforces business chain',
);

assert(
  contains(screen.content, 'Formal Recycler'),
  'B15', 'Formal Recycler actor label present',
);

assert(
  contains(screen.content, 'CITIZEN → LOCAL INFORMAL COLLECTOR') ||
  contains(screen.content, 'CITIZEN → INFORMAL') ||
  contains(screen.content, 'informal-collector-first', 'i') ||
  contains(screen.content, 'mandatory intermediary'),
  'B16', 'Source comment documents Citizen → Informal Collector → Recycler chain',
);

assert(
  contains(screen.content, 'Circular Economy Certificate'),
  'B17', 'Circular Economy Certificate section rendered when available',
);

assert(
  contains(screen.content, 'cachedNotice') || contains(screen.content, 'cached data'),
  'B18', 'Cached data notice shown when offline',
);

assert(
  contains(screen.content, 'navigation.goBack()'),
  'B19', 'Back navigation handled',
);

assert(
  contains(screen.content, 'accessibilityLabel') || contains(screen.content, 'accessibilityRole'),
  'B20', 'Accessibility labels/roles present',
);

assert(
  contains(screen.content, 'retryButton') || contains(screen.content, 'Retry'),
  'B21', 'Retry button in error state',
);

assert(
  !contains(screen.content, 'CITIZEN.*RECYCLER.*direct', 'i') &&
  !contains(screen.content, 'navigate.*Recycler') &&
  !contains(screen.content, 'createRequest.*recycler', 'i'),
  'B22', 'No direct Citizen → Recycler transaction pathway in screen',
);

assert(
  contains(screen.content, 'isStageComplete'),
  'B23', 'isStageComplete helper function defined',
);

assert(
  contains(screen.content, 'isStageInProgress'),
  'B24', 'isStageInProgress helper function defined',
);

assert(
  contains(screen.content, 'CHAIN_STAGES'),
  'B25', 'CHAIN_STAGES array defines ordered lifecycle stages',
);

// ─── C. Navigator Wiring ───────────────────────────────────────────────────────

console.log('\n─── C. Navigator: CitizenNavigator.tsx ───────────────────────────────────');

assert(nav.exists, 'C01', 'CitizenNavigator.tsx exists');

assert(
  contains(nav.content, "import { ItemTraceabilityScreen }"),
  'C02', 'ItemTraceabilityScreen imported',
);

assert(
  contains(nav.content, "from '../screens/citizen/ItemTraceabilityScreen'"),
  'C03', 'Import path is correct',
);

assert(
  contains(nav.content, 'component={ItemTraceabilityScreen}'),
  'C04', 'ItemTraceabilityScreen used as Stack.Screen component',
);

assert(
  contains(nav.content, "name=\"ItemTraceability\""),
  'C05', 'Route name is ItemTraceability',
);

assert(
  contains(nav.content, "presentation: 'modal'"),
  'C06', 'ItemTraceability presented as modal',
);

assert(
  !contains(nav.content, 'component={ItemTraceabilityModal}') &&
  !contains(nav.content, '<ItemTraceabilityModal'),
  'C07', 'Old placeholder ItemTraceabilityModal not used as component (removed from JSX)',
);

// ─── D. Business Rule Enforcement ────────────────────────────────────────────

console.log('\n─── D. Business Rules — ECOSETU Chain Constraints ───────────────────────');

// The chain must have 4 stages in order: citizen, collector, consignment, recycler
const chainStagesStr = screen.content.match(/CHAIN_STAGES[\s\S]*?\];/)?.[0] || '';

assert(
  chainStagesStr.includes("id: 'citizen'"),
  'D01', "CHAIN_STAGES[0] is 'citizen' stage",
);

assert(
  chainStagesStr.includes("id: 'collector'"),
  'D02', "CHAIN_STAGES[1] is 'collector' stage (Informal Collector)",
);

assert(
  chainStagesStr.includes("id: 'consignment'"),
  'D03', "CHAIN_STAGES[2] is 'consignment' stage (Collector → Recycler)",
);

assert(
  chainStagesStr.includes("id: 'recycler'"),
  'D04', "CHAIN_STAGES[3] is 'recycler' stage (Formal Recycler)",
);

// Citizen appears BEFORE collector in the chain
const citizenIdx  = chainStagesStr.indexOf("id: 'citizen'");
const collectorIdx = chainStagesStr.indexOf("id: 'collector'");
const consignIdx   = chainStagesStr.indexOf("id: 'consignment'");
const recyclerIdx  = chainStagesStr.indexOf("id: 'recycler'");

assert(
  citizenIdx < collectorIdx,
  'D05', 'Citizen stage appears before Collector stage in chain',
);

assert(
  collectorIdx < consignIdx,
  'D06', 'Collector stage appears before Consignment stage in chain',
);

assert(
  consignIdx < recyclerIdx,
  'D07', 'Consignment stage appears before Recycler stage in chain',
);

assert(
  contains(screen.content, 'ITEM_STATUS'),
  'D08', 'ITEM_STATUS constants imported and used',
);

assert(
  contains(screen.content, 'CONSIGNMENT_STATUS'),
  'D09', 'CONSIGNMENT_STATUS constants imported and used',
);

assert(
  contains(screen.content, 'RECYCLING_STATUS'),
  'D10', 'RECYCLING_STATUS constants imported and used',
);

// ─── E. Offline-First ────────────────────────────────────────────────────────

console.log('\n─── E. Offline-First Behaviour ──────────────────────────────────────────');

assert(
  contains(screen.content, 'useNetwork'),
  'E01', 'useNetwork hook imported in screen',
);

assert(
  contains(screen.content, 'isConnected'),
  'E02', 'isConnected used to show offline UI',
);

assert(
  contains(service.content, '_getCachedTraceability') &&
  contains(service.content, 'AsyncStorage.getItem'),
  'E03', 'Service reads from AsyncStorage when offline',
);

assert(
  contains(service.content, 'AsyncStorage.setItem'),
  'E04', 'Service writes to AsyncStorage after successful fetch',
);

assert(
  contains(screen.content, 'isCached'),
  'E05', 'Screen tracks isCached state to show stale-data notice',
);

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  Phase 16 — Task 6: Citizen Item Traceability`);
console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ testId, description, detail }) => {
    console.log(`  ❌ [${testId}] ${description}${detail ? ' — ' + detail : ''}`);
  });
  process.exit(1);
} else {
  console.log('\n  All checks passed. Task 6 implementation verified. ✅');
  process.exit(0);
}
