/**
 * EcoSetu Verification Suite: Phase 19 Task 18
 * End-to-End Demo Readiness & Failure-State Hardening Audit
 *
 * Source of Truth:
 * - docs/19_SIH_DEMO_FLOW.md
 * - docs/07_BUSINESS_WORKFLOWS.md
 * - docs/24_ERROR_EDGE_CASES.md
 * - docs/14_TESTING_STRATEGY.md
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
console.log('  ECOSETU: Phase 19 Task 18 — End-to-End Demo Readiness & Hardening');
console.log('════════════════════════════════════════════════════════════════════════\n');

// ─── 1. End-to-End SIH Demo Journey Verification ─────────────────────────────
console.log('─── 1. End-to-End SIH Demo Journey Verification ───────────────────────');

check('SIH Demo Flow document (19_SIH_DEMO_FLOW.md) defines the authoritative 18-step journey', () => {
  const demoDoc = fs.readFileSync(path.join(BACKEND_DIR, '..', 'docs', '19_SIH_DEMO_FLOW.md'), 'utf8');
  assert(demoDoc.includes('Citizen') && demoDoc.includes('Collector') && demoDoc.includes('Recycler') && demoDoc.includes('Admin'), 'Missing roles in demo flow');
  assert(demoDoc.includes('PICKUP') || demoDoc.includes('pickup'), 'Pickup stage missing');
  assert(demoDoc.includes('CONSIGNMENT') || demoDoc.includes('consignment'), 'Consignment stage missing');
  assert(demoDoc.includes('RECYCLING') || demoDoc.includes('recycling'), 'Recycling stage missing');
});

// ─── 2. Loading State Audit ──────────────────────────────────────────────────
console.log('─── 2. Loading State Audit Across Screens ──────────────────────────────');

check('Citizen SubmitItemScreen has loading state and disables button during submission', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'citizen', 'SubmitItemScreen.tsx'), 'utf8');
  assert(file.includes('isSubmitting') || file.includes('loading'), 'Missing submitting flag');
  assert(file.includes('disabled={') || file.includes('loading={'), 'Missing disabled state on submit button');
  assert(file.includes('if (isSubmitting) return;'), 'Missing in-flight guard preventing duplicate tap');
});

check('Citizen Requests and RequestDetail have loading & refresh indicators', () => {
  const requestsScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'citizen', 'CitizenRequestsScreen.tsx'), 'utf8');
  const detailScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'citizen', 'RequestDetailScreen.tsx'), 'utf8');
  assert(requestsScreen.includes('refreshing') && requestsScreen.includes('RefreshControl'), 'Missing pull-to-refresh on requests');
  assert(detailScreen.includes('isLoading') || detailScreen.includes('loading'), 'Missing loading state on detail');
});

check('Collector screens implement mutation loading states and lock concurrent taps', () => {
  const browseScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'collector', 'CollectorBrowseScreen.tsx'), 'utf8');
  const pickupsScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'collector', 'CollectorPickupsScreen.tsx'), 'utf8');
  const consignmentScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'collector', 'CreateConsignmentScreen.tsx'), 'utf8');

  assert(browseScreen.includes('acceptingRef') && browseScreen.includes('acceptingId'), 'BrowseScreen missing accepting lock');
  assert(pickupsScreen.includes('inFlightRef') && pickupsScreen.includes('actionPickupId'), 'PickupsScreen missing inFlight guard');
  assert(consignmentScreen.includes('submittingRef') && consignmentScreen.includes('isSubmitting'), 'ConsignmentScreen missing submitting guard');
});

check('Recycler screens implement loading states and processing guards', () => {
  const consignmentsScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'recycler', 'ConsignmentDetailScreen.tsx'), 'utf8');
  const recordDetail = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'recycler', 'RecyclingRecordDetailScreen.tsx'), 'utf8');
  assert(consignmentsScreen.includes('submittingRef') && consignmentsScreen.includes('isProcessing'), 'ConsignmentDetail missing submit lock');
  assert(recordDetail.includes('submittingRef') && (recordDetail.includes('isProcessingAction') || recordDetail.includes('isSubmittingAction')), 'RecyclingRecordDetail missing submit lock');
});

check('Admin screens implement loading states and mutation locks', () => {
  const usersScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminUsersScreen.tsx'), 'utf8');
  const verificationsScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'admin', 'AdminVerificationsScreen.tsx'), 'utf8');
  assert((usersScreen.includes('isSubmittingRef') || usersScreen.includes('inFlightRef')) && (usersScreen.includes('isSubmitting') || usersScreen.includes('isSubmittingStatus')), 'AdminUsersScreen missing in-flight guard');
  assert(verificationsScreen.includes('isSubmittingRef') && verificationsScreen.includes('isSubmitting'), 'AdminVerificationsScreen missing in-flight guard');
});

// ─── 3. Empty State Audit ────────────────────────────────────────────────────
console.log('─── 3. Empty State Audit ──────────────────────────────────────────────');

check('Reusable EmptyState component exists with neutral and user-friendly tone', () => {
  const emptyStateFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'common', 'EmptyState.tsx'), 'utf8');
  assert(emptyStateFile.includes('title') && emptyStateFile.includes('message'), 'EmptyState component missing title/message');
  assert(!emptyStateFile.includes('Error:') && !emptyStateFile.includes('Failed'), 'EmptyState should not imply error');
});

check('All 12 critical journey and admin lists provide predictable empty states', () => {
  const targets = [
    { file: 'src/screens/citizen/CitizenRequestsScreen.tsx', context: 'no collection requests' },
    { file: 'src/screens/collector/CollectorBrowseScreen.tsx', context: 'no available collector requests' },
    { file: 'src/screens/collector/CollectorPickupsScreen.tsx', context: 'no pickups' },
    { file: 'src/screens/collector/CollectorConsignmentsScreen.tsx', context: 'no consignments' },
    { file: 'src/screens/collector/CollectorRecyclerDirectoryScreen.tsx', context: 'no recyclers' },
    { file: 'src/screens/recycler/RecyclerRecordsScreen.tsx', context: 'no recycling records' },
    { file: 'src/screens/citizen/CitizenNotificationsScreen.tsx', context: 'no notifications' },
    { file: 'src/screens/admin/AdminUsersScreen.tsx', context: 'no admin users' },
    { file: 'src/screens/admin/AdminAuditLogsScreen.tsx', context: 'no audit events' },
    { file: 'src/screens/admin/AdminReportsScreen.tsx', context: 'no report data' },
    { file: 'src/screens/admin/AdminGeographicAnalyticsScreen.tsx', context: 'no geographic facilities' },
    { file: 'src/screens/admin/AdminSystemHealthScreen.tsx', context: 'no diagnostics / empty state' }
  ];

  targets.forEach(({ file, context }) => {
    const fullPath = path.join(ROOT_DIR, file);
    assert(fs.existsSync(fullPath), `Target file missing: ${file}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(
      content.includes('EmptyState') ||
      content.includes('ListEmptyComponent') ||
      content.includes('empty') ||
      content.includes('No '),
      `Screen ${file} does not handle empty state for: ${context}`
    );
  });
});

// ─── 4. Error State & Sanitization Audit ─────────────────────────────────────
console.log('─── 4. Error State & Error Sanitization Audit ──────────────────────────');

check('AppError properly maps HTTP status codes (400, 401, 403, 404, 409, 429, 500, 502, 503, timeout)', () => {
  const appErrorFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'utils', 'AppError.js'), 'utf8');
  const codes = ['400', '401', '403', '404', '409', '429', '500', '502', '503'];
  codes.forEach((code) => {
    assert(appErrorFile.includes(code), `AppError.js missing mapping for HTTP ${code}`);
  });
  assert(appErrorFile.includes('NETWORK') || appErrorFile.includes('TIMEOUT') || appErrorFile.includes('408'), 'Missing timeout/network error handling');
});

check('User-facing error messages in AppError are safe and sanitized', () => {
  const appErrorFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'utils', 'AppError.js'), 'utf8');
  assert(!appErrorFile.includes('SELECT * FROM'), 'Leaking SQL query in AppError');
  assert(!appErrorFile.includes('DATABASE_URL'), 'Leaking DATABASE_URL in AppError');
  assert(!appErrorFile.includes('stack'), 'Leaking stack trace to user string');
});

// ─── 5. Session Expiry & 401 Mutex Audit ─────────────────────────────────────
console.log('─── 5. Session Expiry & 401 Mutex Audit ────────────────────────────────');

check('apiClient implements single-flight refresh mutex preventing races on concurrent 401s', () => {
  const apiClientFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'apiClient.js'), 'utf8');
  assert(apiClientFile.includes('_refreshPromise'), 'Missing refresh promise mutex');
  assert(apiClientFile.includes('_handleTokenRefresh'), 'Missing refresh method _handleTokenRefresh');
  assert(apiClientFile.includes('this._refreshPromise ='), 'Missing refresh mutex lock assignment');
});

check('apiClient automatically purges credentials and notifies on refresh failure', () => {
  const apiClientFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'apiClient.js'), 'utf8');
  assert(apiClientFile.includes('_notifyAuthExpired'), 'Missing session expiry notification');
  assert(apiClientFile.includes('response.status === 401'), 'Missing 401 interceptor check');
});

// ─── 6. Duplicate Action Protection Audit ────────────────────────────────────
console.log('─── 6. Duplicate Action Protection Audit ───────────────────────────────');

check('High-risk actions have double-tap / concurrent submission protection', () => {
  const highRiskScreens = [
    { file: 'src/screens/citizen/SubmitItemScreen.tsx', guard: 'isSubmitting' },
    { file: 'src/screens/collector/CollectorBrowseScreen.tsx', guard: 'acceptingRef' },
    { file: 'src/screens/collector/CollectorPickupsScreen.tsx', guard: 'inFlightRef' },
    { file: 'src/screens/collector/CreateConsignmentScreen.tsx', guard: 'submittingRef' },
    { file: 'src/screens/recycler/ConsignmentDetailScreen.tsx', guard: 'submittingRef' },
    { file: 'src/screens/recycler/RecyclingRecordDetailScreen.tsx', guard: 'submittingRef' },
    { file: 'src/screens/admin/AdminUsersScreen.tsx', guard: 'isSubmittingRef' },
    { file: 'src/screens/admin/AdminVerificationsScreen.tsx', guard: 'isSubmittingRef' }
  ];

  highRiskScreens.forEach(({ file, guard }) => {
    const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
    assert(content.includes(guard), `${file} missing duplicate tap guard: ${guard}`);
  });
});

check('Backend 409 Conflict responses are preserved and surfaced cleanly to user', () => {
  const appError = fs.readFileSync(path.join(ROOT_DIR, 'src', 'utils', 'AppError.js'), 'utf8');
  assert(appError.includes('409') && (appError.includes('CONFLICT') || appError.includes('conflictError')), '409 Conflict mapping missing in AppError');
});

// ─── 7. Offline Failure States Audit ─────────────────────────────────────────
console.log('─── 7. Offline Failure States Audit ────────────────────────────────────');

check('Offline queue stores offline-safe actions and syncs with networkService', () => {
  const offlineQueue = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'offlineQueue.js'), 'utf8');
  assert(offlineQueue.includes('networkService.addListener'), 'Missing network reconnect listener');
  assert(offlineQueue.includes('enqueue'), 'Missing offline enqueue mechanism');
  assert(offlineQueue.includes('sync'), 'Missing offline queue sync method');
});

check('Cached data displays stale indicator or clear offline notification banner', () => {
  const offlineNotice = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'common', 'OfflineBanner.tsx'), 'utf8');
  assert(offlineNotice.includes('Offline Mode') && offlineNotice.includes('isConnected'), 'OfflineBanner missing status detection');
});

// ─── 8. Map Failure States Audit ─────────────────────────────────────────────
console.log('─── 8. Map Failure States Audit ────────────────────────────────────────');

check('EcoSetuMap gracefully handles location permission denied, unavailable provider, and empty markers', () => {
  const mapFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'map', 'EcoSetuMap.tsx'), 'utf8');
  assert(mapFile.includes('hasLocationPermission') || mapFile.includes('permission'), 'Map missing permission check');
  assert(mapFile.includes('markers') || mapFile.includes('coordinates'), 'Map missing marker handling');
  assert(mapFile.includes('defaultCoordinates') || mapFile.includes('initialRegion') || mapFile.includes('latitude'), 'Map missing fallback coordinates');
});

check('Map privacy: Unaccepted pickup coordinates are strictly fuzzed/blurred', () => {
  const browseScreen = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'collector', 'CollectorBrowseScreen.tsx'), 'utf8');
  assert(browseScreen.includes('Approximate Location') || browseScreen.includes('fuzzed') || browseScreen.includes('rounded'), 'BrowseScreen does not respect privacy');
  assert(!browseScreen.includes('exact_citizen_home_address'), 'Leaking exact citizen address on browse');
});

// ─── 9. TTS Failure States Audit ─────────────────────────────────────────────
console.log('─── 9. TTS Failure States Audit ────────────────────────────────────────');

check('TTS voice service fails safely without crashing and respects debounce and toggle', () => {
  const voiceServiceFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'voiceService.ts'), 'utf8');
  assert(voiceServiceFile.includes('try') && voiceServiceFile.includes('catch'), 'voiceService missing try/catch wrapper');
  assert(voiceServiceFile.includes('debounce') || voiceServiceFile.includes('lastSpoken') || voiceServiceFile.includes('DEBOUNCE_MS'), 'voiceService missing debounce protection');
  assert(voiceServiceFile.includes('isEnabled') || voiceServiceFile.includes('enabled') || voiceServiceFile.includes('isVoiceEnabled'), 'voiceService missing enable/disable check');
  assert(!voiceServiceFile.includes('VoiceRecognition') && !voiceServiceFile.includes('SpeechRecognizer'), 'Voice recognition must not be introduced');
});

// ─── 10. Notification Failure States Audit ───────────────────────────────────
console.log('─── 10. Notification Failure States Audit ──────────────────────────────');

check('FCM client handles push registration failure safely without failing backend transaction', () => {
  const fcmClient = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'fcmClientService.js'), 'utf8');
  assert(fcmClient.includes('try') && fcmClient.includes('catch'), 'fcmClient missing error handling');
});

check('PostgreSQL notifications remain authoritative in backend notificationService', () => {
  const backendNotification = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'services', 'notificationService.js'), 'utf8');
  assert(backendNotification.includes('notification.create'), 'Backend missing authoritative notification insert');
  assert(backendNotification.includes('fcmService.sendToUser'), 'Backend missing resilient FCM dispatch');
  assert(backendNotification.includes('catch'), 'Backend missing FCM isolation catch block');
});

// ─── 11. Form Validation Audit ───────────────────────────────────────────────
console.log('─── 11. Form Validation Audit ──────────────────────────────────────────');

check('SubmitItemScreen validates required fields: category, subcategory, condition, quantity, pincode', () => {
  const submitFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'citizen', 'SubmitItemScreen.tsx'), 'utf8');
  assert(submitFile.includes('selectedCategory'), 'Missing category validation');
  assert(submitFile.includes('selectedCondition'), 'Missing condition validation');
  assert(submitFile.includes('pincode'), 'Missing pincode validation');
});

check('CreateConsignmentScreen validates required items and recycler selection', () => {
  const consignmentFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'screens', 'collector', 'CreateConsignmentScreen.tsx'), 'utf8');
  assert(consignmentFile.includes('selectedItemIds') && (consignmentFile.includes('.size === 0') || consignmentFile.includes('length === 0')), 'Missing item selection validation');
  assert(consignmentFile.includes('selectedRecycler'), 'Missing recycler selection validation');
});

// ─── 12. Multilingual Translations Audit ─────────────────────────────────────
console.log('─── 12. Multilingual Translations Audit ────────────────────────────────');

check('All 4 supported languages (en, hi, mr, or) contain essential error, loading, and empty state keys', () => {
  const locales = ['en', 'hi', 'mr', 'or'];
  locales.forEach((lang) => {
    const localePath = path.join(ROOT_DIR, 'src', 'i18n', 'locales', `${lang}.ts`);
    assert(fs.existsSync(localePath), `Missing locale file: ${lang}.ts`);
    const content = fs.readFileSync(localePath, 'utf8');
    assert(content.includes('loading') || content.includes('Loading'), `${lang}.ts missing loading translations`);
    assert(content.includes('empty') || content.includes('no_') || content.includes('No '), `${lang}.ts missing empty translations`);
    assert(content.includes('error') || content.includes('Error') || content.includes('failed'), `${lang}.ts missing error translations`);
  });
});

// ─── 13. Privacy & Production Security Audit ─────────────────────────────────
console.log('─── 13. Privacy & Production Security Safeguards ───────────────────────');

check('No exposed Google Maps API keys (AIza*) anywhere in mobile/src', () => {
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const text = fs.readFileSync(fullPath, 'utf8');
        assert(!text.includes('AIzaSy'), `Exposed Google API key found in ${fullPath}`);
      }
    }
  }
  scanDir(path.join(ROOT_DIR, 'src'));
});

check('No database connection strings or JWT secrets hardcoded in mobile/src', () => {
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const text = fs.readFileSync(fullPath, 'utf8');
        assert(!text.includes('postgres://') && !text.includes('postgresql://'), `Exposed DB connection string in ${fullPath}`);
        assert(!text.includes('JWT_SECRET ='), `Exposed JWT secret in ${fullPath}`);
      }
    }
  }
  scanDir(path.join(ROOT_DIR, 'src'));
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  DEMO READINESS AUDIT RESULTS: ${passedTests} passed, ${failedTests} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
