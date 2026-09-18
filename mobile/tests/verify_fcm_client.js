/**
 * verify_fcm_client.js
 * Verification suite for Phase 18 Task 9 — FCM Mobile Client Integration.
 *
 * Covers:
 *   A. Mobile FCM Client Service (fcmClientService.js)
 *   B. Notification Service Device Token Methods (notificationService.js)
 *   C. AuthService Logout Integration (authService.js)
 *   D. Push Payload Structure & PII Protection
 *   E. Deep-linking and Navigation Mapping
 */

const fs = require('fs');
const path = require('path');

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
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

console.log('====================================================');
console.log('ECOSETU MOBILE FCM CLIENT VERIFICATION SUITE');
console.log('====================================================\n');

// ─── Load Subjects ─────────────────────────────────────────────────────────────

const fcmSvc = readFile('src/services/fcmClientService.js');
const notifSvc = readFile('src/services/notificationService.js');
const authSvc = readFile('src/services/authService.js');

// ─── A. Mobile FCM Client Service ──────────────────────────────────────────────
console.log('─── A. Mobile FCM Client Service ──────────────────────────────────────');

assert(fcmSvc.exists, 'A01', 'fcmClientService.js exists');
assert(contains(fcmSvc.content, 'class FcmClientService'), 'A02', 'FcmClientService class defined');
assert(contains(fcmSvc.content, 'syncTokenWithBackend'), 'A03', 'syncTokenWithBackend method defined');
assert(contains(fcmSvc.content, 'getStoredToken'), 'A04', 'getStoredToken method defined');
assert(contains(fcmSvc.content, 'unregisterOnLogout'), 'A05', 'unregisterOnLogout method defined');
assert(contains(fcmSvc.content, 'handleForegroundNotification'), 'A06', 'handleForegroundNotification method defined');
assert(contains(fcmSvc.content, 'handleNotificationTap'), 'A07', 'handleNotificationTap method defined');
assert(contains(fcmSvc.content, 'addListener'), 'A08', 'addListener event subscription defined');
assert(contains(fcmSvc.content, '@ecosetu_fcm_token'), 'A09', 'Uses dedicated AsyncStorage key for FCM token');

// ─── B. Notification Service Device Token Methods ──────────────────────────────
console.log('\n─── B. Notification Service Device Token Methods ───────────────────────');

assert(contains(notifSvc.content, 'registerDeviceToken'), 'B01', 'registerDeviceToken method defined on notificationService');
assert(contains(notifSvc.content, '/notifications/device-token'), 'B02', 'Calls /notifications/device-token endpoint');
assert(contains(notifSvc.content, 'unregisterDeviceToken'), 'B03', 'unregisterDeviceToken method defined on notificationService');
assert(contains(notifSvc.content, 'apiClient.delete'), 'B04', 'Uses DELETE method to unregister device token');

// ─── C. AuthService Logout Integration ─────────────────────────────────────────
console.log('\n─── C. AuthService Logout Integration ───────────────────────────────────');

assert(contains(authSvc.content, 'fcmClientService'), 'C01', 'authService imports fcmClientService');
assert(contains(authSvc.content, 'fcmClientService.unregisterOnLogout()'), 'C02', 'authService calls unregisterOnLogout() during logout');

// ─── D. Deep-linking and Navigation Mapping ────────────────────────────────────
console.log('\n─── D. Deep-linking and Navigation Mapping ──────────────────────────────');

assert(contains(fcmSvc.content, 'collection_request'), 'D01', 'Maps collection_request events to RequestDetail');
assert(contains(fcmSvc.content, 'RequestDetail'), 'D02', 'Navigates to RequestDetail screen for request events');
assert(contains(fcmSvc.content, 'consignment'), 'D03', 'Maps consignment events to ConsignmentDetail');
assert(contains(fcmSvc.content, 'ConsignmentDetail'), 'D04', 'Navigates to ConsignmentDetail screen for consignment events');
assert(contains(fcmSvc.content, 'Notifications'), 'D05', 'Falls back to Notifications screen on generic alert');

// ─── E. Security and PII Guard ─────────────────────────────────────────────────
console.log('\n─── E. Security and PII Guard ───────────────────────────────────────────');

assert(!contains(fcmSvc.content, 'password'), 'E01', 'No password handling in FCM client');
assert(!contains(fcmSvc.content, 'jwtAccessSecret'), 'E02', 'No server secrets in FCM client');
assert(!contains(fcmSvc.content, 'privateKey'), 'E03', 'No private keys in FCM client');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS)`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
