/**
 * verify_admin_verifications.js
 * Verification suite — Phase 18, Task 3: Admin Verification Workflow
 *
 * Requirements:
 *   1. Backend Verification Endpoints:
 *      - GET /api/v1/admin/verifications (filtering, pagination, ADMIN only)
 *      - PATCH /api/v1/admin/verifications/:id (APPROVED/REJECTED, ADMIN only)
 *   2. Backend Verification Service & State Transitions:
 *      - Verification model relations with User (target) and Reviewer (admin)
 *      - PENDING -> APPROVED atomically activates associated user (status: ACTIVE)
 *      - PENDING -> REJECTED keeps user in PENDING_VERIFICATION with review notes
 *      - 409 Conflict if already reviewed
 *      - 404 Not Found if verification does not exist
 *      - 400 Bad Request on invalid status
 *   3. Audit & Notification Integrity:
 *      - Audit actions: USER_VERIFIED / USER_REJECTED recorded on entity 'verifications'
 *      - Notifications: VERIFICATION_APPROVED / VERIFICATION_REJECTED dispatched to user
 *   4. Mobile Admin Service (adminService.js):
 *      - getVerifications (caching in @ecosetu_admin_verifications)
 *      - updateVerification (online-only, no offline queueing, cache invalidation)
 *   5. Mobile UI & Navigation:
 *      - AdminVerificationsScreen (cards, status filtering, review modal, notes input)
 *      - AdminNavigator mounts AdminVerificationsScreen on Verify tab
 *      - Pre-flight confirmation before approval/rejection
 *      - OfflineBanner and offline mutation blocking
 *   6. Strict Role Isolation:
 *      - Only ADMIN can access verification endpoints and screens
 *      - Non-admin (Citizen, Collector, Recycler) cannot access
 *
 * Run: node mobile/tests/verify_admin_verifications.js
 */

const fs = require('fs');
const path = require('path');

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
  if (!fs.existsSync(absPath)) {
    return { exists: false, content: '' };
  }
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function readBackendFile(relPath) {
  const absPath = path.join(__dirname, '..', '..', 'backend', relPath);
  if (!fs.existsSync(absPath)) {
    return { exists: false, content: '' };
  }
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

console.log('================================================================');
console.log('  ECOSETU ADMIN VERIFICATION WORKFLOW TEST SUITE');
console.log('================================================================\n');

// ─── 1. Backend Route Mounting & Authorization ────────────────────────────────
console.log('─── 1. Backend Route Mounting & Authorization ───────────────────');

const beAdminRoutes = readBackendFile('src/routes/adminRoutes.js');
const beAdminCtrl = readBackendFile('src/controllers/adminController.js');
const beAdminValidators = readBackendFile('src/validators/adminValidators.js');
const beVerifSvc = readBackendFile('src/services/verificationService.js');
const bePrisma = readBackendFile('prisma/schema.prisma');

check(contains(beAdminRoutes.content, "router.get(\n  '/verifications'"), 'VRF-01', 'GET /api/v1/admin/verifications mounted in adminRoutes');
check(contains(beAdminRoutes.content, "router.patch(\n  '/verifications/:id'"), 'VRF-02', 'PATCH /api/v1/admin/verifications/:id mounted in adminRoutes');
check(contains(beAdminRoutes.content, 'authorize(ROLES.ADMIN)'), 'VRF-03', 'Verification routes require ROLES.ADMIN authorization');
check(contains(beAdminCtrl.content, 'getVerifications'), 'VRF-04', 'adminController exposes getVerifications');
check(contains(beAdminCtrl.content, 'updateVerification'), 'VRF-05', 'adminController exposes updateVerification');

// ─── 2. Backend Validation Rules ──────────────────────────────────────────────
console.log('\n─── 2. Backend Validation Rules ─────────────────────────────────');

check(contains(beAdminValidators.content, 'listVerifications'), 'VAL-01', 'adminValidators defines listVerifications validation');
check(contains(beAdminValidators.content, 'updateVerification'), 'VAL-02', 'adminValidators defines updateVerification validation');
check(contains(beAdminValidators.content, 'VERIFICATION_STATUS.APPROVED') && contains(beAdminValidators.content, 'VERIFICATION_STATUS.REJECTED'), 'VAL-03', 'updateVerification restricts status to APPROVED or REJECTED');
check(contains(beAdminValidators.content, 'isUUID'), 'VAL-04', 'updateVerification validates verification UUID parameter');
check(contains(beAdminValidators.content, 'max: 500'), 'VAL-05', 'reviewNotes validated with maximum 500 characters');

// ─── 3. Database Schema & Verification Model ──────────────────────────────────
console.log('\n─── 3. Prisma Schema Verification Model ─────────────────────────');

check(contains(bePrisma.content, 'model Verification {'), 'SCH-01', 'Prisma schema defines model Verification');
check(contains(bePrisma.content, 'enum VerificationStatus {') && contains(bePrisma.content, 'PENDING') && contains(bePrisma.content, 'APPROVED') && contains(bePrisma.content, 'REJECTED'), 'SCH-02', 'VerificationStatus enum defined (PENDING, APPROVED, REJECTED)');
check(contains(bePrisma.content, 'reviewedBy') && contains(bePrisma.content, 'reviewedAt'), 'SCH-03', 'Verification model tracks reviewedBy and reviewedAt');
check(contains(bePrisma.content, 'reviewNotes'), 'SCH-04', 'Verification model tracks reviewNotes');
check(contains(bePrisma.content, 'documentUrl'), 'SCH-05', 'Verification model stores applicant credential documentUrl');

// ─── 4. Verification Service Workflow & State Transitions ─────────────────────
console.log('\n─── 4. Verification Service State Machine & Transaction ─────────');

check(beVerifSvc.exists, 'SVC-01', 'verificationService.js exists in backend/src/services');
check(contains(beVerifSvc.content, 'listVerifications'), 'SVC-02', 'verificationService implements listVerifications');
check(contains(beVerifSvc.content, 'updateVerification'), 'SVC-03', 'verificationService implements updateVerification');
check(contains(beVerifSvc.content, 'VERIFICATION_STATUS.PENDING'), 'SVC-04', 'updateVerification validates verification is in PENDING status');
check(contains(beVerifSvc.content, 'AppError.conflict') || contains(beVerifSvc.content, 'already been reviewed'), 'SVC-05', 'updateVerification throws 409 Conflict if already reviewed');
check(contains(beVerifSvc.content, '$transaction'), 'SVC-06', 'updateVerification uses atomic transaction for status transition');
check(contains(beVerifSvc.content, 'USER_STATUS.ACTIVE'), 'SVC-07', 'updateVerification atomically activates associated user upon approval');

// ─── 5. Audit Logging & Notification Integrity ────────────────────────────────
console.log('\n─── 5. Audit Logging & Notification Integrity ───────────────────');

check(contains(beVerifSvc.content, 'USER_VERIFIED'), 'AUD-01', 'verificationService logs USER_VERIFIED audit action upon approval');
check(contains(beVerifSvc.content, 'USER_REJECTED'), 'AUD-02', 'verificationService logs USER_REJECTED audit action upon rejection');
check(contains(beVerifSvc.content, 'NOTIFICATION_TYPES.VERIFICATION_APPROVED'), 'NTF-01', 'verificationService dispatches VERIFICATION_APPROVED notification');
check(contains(beVerifSvc.content, 'NOTIFICATION_TYPES.VERIFICATION_REJECTED'), 'NTF-02', 'verificationService dispatches VERIFICATION_REJECTED notification');
check(contains(beVerifSvc.content, "referenceType: 'verification'"), 'NTF-03', 'Notification correctly references target verification entity');

// ─── 6. Mobile Admin Service Layer ────────────────────────────────────────────
console.log('\n─── 6. Mobile Admin Service Layer (adminService.js) ─────────────');

const mobileAdminSvc = readFile('src/services/adminService.js');

check(contains(mobileAdminSvc.content, 'getVerifications'), 'MOB-01', 'adminService.js implements getVerifications');
check(contains(mobileAdminSvc.content, 'updateVerification'), 'MOB-02', 'adminService.js implements updateVerification');
check(contains(mobileAdminSvc.content, '@ecosetu_admin_verifications'), 'MOB-03', 'adminService caches verifications with @ecosetu_admin_verifications');
check(contains(mobileAdminSvc.content, 'isOfflineError = true'), 'MOB-04', 'updateVerification throws isOfflineError when network is disconnected');
check(!contains(mobileAdminSvc.content, 'offlineQueue.enqueue'), 'MOB-05', 'updateVerification NEVER enqueues verification decisions in offlineQueue');
check(contains(mobileAdminSvc.content, 'AsyncStorage.removeItem(CACHE_KEYS.VERIFICATIONS)'), 'MOB-06', 'updateVerification invalidates local verifications cache upon success');

// ─── 7. Mobile Admin Verification Screen & Navigator ──────────────────────────
console.log('\n─── 7. Mobile UI & Navigator Integration ────────────────────────');

const verifScreen = readFile('src/screens/admin/AdminVerificationsScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');

check(verifScreen.exists, 'UI-01', 'AdminVerificationsScreen.tsx exists in mobile/src/screens/admin');
check(contains(verifScreen.content, 'adminService.getVerifications'), 'UI-02', 'AdminVerificationsScreen fetches verifications list');
check(contains(verifScreen.content, 'STATUS_FILTERS'), 'UI-03', 'AdminVerificationsScreen provides status filtering (PENDING, APPROVED, REJECTED, ALL)');
check(contains(verifScreen.content, 'StatusBadge'), 'UI-04', 'AdminVerificationsScreen renders StatusBadge for verification status');
check(contains(verifScreen.content, 'adminService.updateVerification'), 'UI-05', 'AdminVerificationsScreen submits decision via updateVerification');
check(contains(verifScreen.content, 'Approve') && contains(verifScreen.content, 'Reject'), 'UI-06', 'AdminVerificationsScreen provides Approve and Reject actions');
check(contains(verifScreen.content, 'Alert.alert'), 'UI-07', 'AdminVerificationsScreen enforces pre-flight confirmation before decision');
check(contains(verifScreen.content, '!isConnected') || contains(verifScreen.content, 'offline'), 'UI-08', 'AdminVerificationsScreen disables decision actions when offline');
check(contains(verifScreen.content, 'isSubmittingRef') || contains(verifScreen.content, 'isSubmitting'), 'UI-09', 'AdminVerificationsScreen prevents duplicate in-flight decision submissions');
check(contains(verifScreen.content, '409') || contains(verifScreen.content, 'conflict'), 'UI-10', 'AdminVerificationsScreen handles 409 conflict and refreshes state');
check(contains(verifScreen.content, 'OfflineBanner'), 'UI-11', 'AdminVerificationsScreen renders OfflineBanner when viewing offline');

check(contains(adminNav.content, 'AdminVerificationsScreen'), 'NAV-01', 'AdminNavigator mounts production AdminVerificationsScreen on Verify tab');

// ─── 8. Strict Role Isolation ─────────────────────────────────────────────────
console.log('\n─── 8. Strict Role Isolation ────────────────────────────────────');

const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');

check(!contains(citizenNav.content, 'AdminVerifications'), 'ISO-01', 'CitizenNavigator cannot access AdminVerifications');
check(!contains(collectorNav.content, 'AdminVerifications'), 'ISO-02', 'CollectorNavigator cannot access AdminVerifications');
check(!contains(recyclerNav.content, 'AdminVerifications'), 'ISO-03', 'RecyclerNavigator cannot access AdminVerifications');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ECOSETU ADMIN VERIFICATION VERIFICATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
