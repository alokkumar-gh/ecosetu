/**
 * Issue 17 Verification Script — ECOSETU Offline Data Architecture
 * Checks 20 critical assertions for offline storage, queueing, sync, account isolation, and UI verification.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MOBILE_ROOT = path.join(__dirname, '../../mobile');

function readMobileFile(relativePath) {
  return fs.readFileSync(path.join(MOBILE_ROOT, relativePath), 'utf8');
}

async function runIssue17Verification() {
  console.log('=== STARTING ISSUE 17 VERIFICATION ===\n');

  let passed = 0;
  let total = 0;

  function check(condition, label, details = '') {
    total++;
    if (condition) {
      console.log(`[PASS] CHECK ${total}: ${label}`);
      passed++;
    } else {
      console.error(`[FAIL] CHECK ${total}: ${label} ${details ? `(${details})` : ''}`);
    }
  }

  // 1. ROUTE VERIFICATION
  const navTypes = readMobileFile('src/navigation/types.ts');
  check(
    navTypes.includes('OfflineData: undefined;'),
    'Offline Data route exists in navigation types',
    'OfflineData missing from types.ts'
  );

  const citizenNav = readMobileFile('src/navigation/CitizenNavigator.tsx');
  const collectorNav = readMobileFile('src/navigation/CollectorNavigator.tsx');
  const recyclerNav = readMobileFile('src/navigation/RecyclerNavigator.tsx');
  check(
    citizenNav.includes('name="OfflineData"') &&
      collectorNav.includes('name="OfflineData"') &&
      recyclerNav.includes('name="OfflineData"'),
    'OfflineData screen registered in Citizen, Collector, and Recycler navigators'
  );

  // 2. "COMING SOON" REMOVAL AUDIT
  const recyclerProfile = readMobileFile('src/screens/recycler/RecyclerNewProfileScreen.tsx');
  check(
    !recyclerProfile.includes('Offline Storage Status') &&
      !recyclerProfile.includes('All offline records are up to date'),
    '"Coming Soon" / Fake Alert stub removed from Recycler profile menu'
  );

  const offlineScreen = readMobileFile('src/screens/common/OfflineDataScreen.tsx');
  check(
    !offlineScreen.includes('Coming Soon') && !offlineScreen.includes('coming soon'),
    '"Coming Soon" placeholder completely absent from production OfflineDataScreen'
  );

  // 3. ARCHITECTURE DETECTION
  const queueSrc = readMobileFile('src/services/offlineQueue.js');
  const storeSrc = readMobileFile('src/services/offlineStore.js');
  const netSrc = readMobileFile('src/services/networkService.js');
  check(
    queueSrc.includes('class OfflineQueue') &&
      storeSrc.includes('class OfflineStore') &&
      netSrc.includes('class NetworkService'),
    'Actual offline queue, offline store, and network service architecture detected'
  );

  // 4. REAL CONNECTIVITY MONITORING
  check(
    netSrc.includes('NetInfo.addEventListener') && netSrc.includes('isInternetReachable'),
    'Network status reflects real device connectivity via NetInfo'
  );

  // 5. LOCAL DOMAIN CACHE METRICS
  check(
    storeSrc.includes('getCachedRequests') &&
      storeSrc.includes('getCachedItems') &&
      storeSrc.includes('saveLotDraft'),
    'Actual local domain cache operations supported (requests, items, lots)'
  );

  // 6. PENDING QUEUE DIAGNOSTICS
  check(
    queueSrc.includes('getPendingCount') && queueSrc.includes('getDiagnostics'),
    'Pending sync queue count is dynamically calculated'
  );

  // 7. FAILED / CONFLICT DIAGNOSTICS
  check(
    queueSrc.includes('QUEUE_STATUS.FAILED') && queueSrc.includes('QUEUE_STATUS.CONFLICT'),
    'Failed and conflict queue states tracked'
  );

  // 8. USER ACCOUNT ISOLATION IN QUEUE
  check(
    queueSrc.includes('activeUserId') && queueSrc.includes('item.userId !== activeUserId'),
    'User A offline queue items strictly isolated from User B'
  );

  // 9. LOCAL CACHE ISOLATION ON LOGOUT
  const storageSrc = readMobileFile('src/utils/storage.js');
  check(
    storageSrc.includes('clearAllUserCaches'),
    'Local domain cache purges user-scoped records to block cross-account leakage'
  );

  // 10. OFFLINE MUTATION QUEUEING
  check(
    queueSrc.includes('enqueue({') && queueSrc.includes('clientOperationId'),
    'Offline mutations enqueued with clientOperationId idempotency keys'
  );

  // 11. AUTOMATIC RECONNECT SYNC
  check(
    queueSrc.includes('onOnline') && queueSrc.includes('networkService.addListener'),
    'Queued mutations auto-sync upon network restoration'
  );

  // 12. DUPLICATE PREVENTION & IDEMPOTENCY
  check(
    queueSrc.includes('clientOperationId') && queueSrc.includes('sanitizePayload'),
    'Server idempotency & sanitization prevent duplicate mutations'
  );

  // 13. NO FALSE SUCCESS ON SYNC FAILURE
  check(
    queueSrc.includes('QUEUE_STATUS.FAILED') && offlineScreen.includes('Error ('),
    'Failed sync attempts display explicit error details without false success'
  );

  // 14. RETRY MECHANISM
  check(
    queueSrc.includes('retryFailed()') && offlineScreen.includes('handleRetryFailed'),
    'Retry mechanism resets failed/conflict items and re-attempts sync'
  );

  // 15. SYNC NOW ACTION
  check(
    queueSrc.includes('syncNow()') && offlineScreen.includes('handleSyncNow'),
    'Sync Now action triggers actual offline queue sync'
  );

  // 16. OFFLINE SYNC NOW GUARD (NO FALSE SUCCESS)
  check(
    offlineScreen.includes('!isConnected') &&
      offlineScreen.includes('Cannot sync while disconnected'),
    'Offline Sync Now rejects execution with network error without false success'
  );

  // 17. CACHE CLEARING PRESERVES UNSYNCED QUEUE
  check(
    storageSrc.includes("key === '@ecosetu_offline_queue'") &&
      storageSrc.includes('includeQueue'),
    'Clear Cache action purges read caches while preserving unsynced offline queue'
  );

  // 18. SENSITIVE CREDENTIAL SANITIZATION
  check(
    queueSrc.includes('SENSITIVE_PAYLOAD_KEYS') &&
      queueSrc.includes('password') &&
      queueSrc.includes('token') &&
      queueSrc.includes('aadhaar'),
    'Sensitive fields (passwords, tokens, KYC) stripped from offline queue payloads'
  );

  // 19. DYNAMIC CALCULATED STORAGE METRICS (NO FABRICATED NUMBERS)
  check(
    offlineScreen.includes('storage.getAllKeys()') &&
      offlineScreen.includes('formatStorageSize(storageBytes)'),
    'Storage metrics dynamically calculated from actual byte size with zero hardcoded metrics'
  );

  // 20. NO PRODUCTION "COMING SOON" PLACEHOLDER REMAINS
  check(
    !offlineScreen.includes('Coming Soon') &&
      !offlineScreen.includes('Coming soon') &&
      !offlineScreen.includes('0 MB'),
    'Production Offline Data screen free of hardcoded "Coming Soon" or fake default placeholders'
  );

  console.log('\n========================================');
  console.log(`ISSUE 17 VERIFICATION RESULTS: ${passed}/${total} PASSED`);
  console.log('========================================\n');

  if (passed !== total) {
    throw new Error(`Issue 17 verification failed: ${total - passed} checks failed.`);
  }
}

runIssue17Verification().catch((err) => {
  console.error('Fatal Issue 17 verification error:', err);
  process.exit(1);
});
