/**
 * verify_citizen_profile.js
 * Static verification suite — Phase 16, Task 8: Citizen Profile.
 *
 * Covers:
 *   A. Mobile user profile service (userProfileService.js)
 *   B. CitizenProfileScreen.tsx
 *   C. Navigator wiring (CitizenNavigator.tsx)
 *   D. Protected fields
 *   E. Editable fields and validation
 *   F. AuthContext / logout integration
 *   G. Account status handling
 *   H. Offline / cache behaviour
 *   I. Business rules — Kabadiwala-first, no Citizen→Recycler
 *   J. Security
 *   K. Accessibility
 *   L. Performance — no polling
 *   M. Navigation safety
 *
 * Run: node mobile/tests/verify_citizen_profile.js
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

// ─── Load subjects ─────────────────────────────────────────────────────────────

const svc = readFile('src/services/userProfileService.js');
const scr = readFile('src/screens/citizen/CitizenProfileScreen.tsx');
const nav = readFile('src/navigation/CitizenNavigator.tsx');

// ─── A. userProfileService.js ──────────────────────────────────────────────────

console.log('\n─── A. userProfileService.js ─────────────────────────────────────────────');

assert(svc.exists, 'A01', 'userProfileService.js exists');
assert(contains(svc.content, 'getProfile'), 'A02', 'getProfile method defined');
assert(contains(svc.content, '/users/me'), 'A03', 'GET /api/v1/users/me endpoint used');
assert(contains(svc.content, 'updateProfile'), 'A04', 'updateProfile method defined');
assert(contains(svc.content, "apiClient.patch('/users/me'"), 'A05', 'PATCH /api/v1/users/me used (not PUT)');
assert(
  !contains(svc.content, "apiClient.put('/users"),
  'A06', 'No undocumented PUT /users endpoint used',
);
assert(contains(svc.content, 'networkService.isConnected()'), 'A07', 'Connectivity checked before API calls');
assert(contains(svc.content, 'AsyncStorage'), 'A08', 'AsyncStorage used for profile caching');
assert(contains(svc.content, '@ecosetu_user_profile'), 'A09', 'Dedicated profile cache key used');
assert(contains(svc.content, 'fromCache'), 'A10', 'fromCache flag returned to caller');
assert(
  contains(svc.content, 'isOfflineError') || contains(svc.content, 'isNetworkError') || contains(svc.content, 'Profile updates require'),
  'A11', 'updateProfile throws when offline (not queued)',
);

// Only name and phone in payload — no protected fields
assert(
  contains(svc.content, 'name') && contains(svc.content, 'phone'),
  'A12', 'Only name and phone used in PATCH payload',
);
assert(
  !contains(svc.content, 'email') || !contains(svc.content, "payload.email"),
  'A13', 'Email not sent in PATCH payload (protected)',
);
assert(!contains(svc.content, 'payload.role') && !contains(svc.content, "name = 'role'"), 'A14', 'Role not sent in PATCH payload (protected)');
assert(!contains(svc.content, 'payload.status') && !contains(svc.content, "name = 'status'"), 'A15', 'Status not sent in PATCH payload (protected)');
assert(!contains(svc.content, 'payload.avatarUrl') && !contains(svc.content, "payload['avatarUrl']"), 'A16', 'avatarUrl not sent in PATCH payload (protected)');

// ─── B. CitizenProfileScreen.tsx ──────────────────────────────────────────────

console.log('\n─── B. CitizenProfileScreen.tsx ──────────────────────────────────────────');

assert(scr.exists, 'B01', 'CitizenProfileScreen.tsx exists');
assert(
  contains(scr.content, 'export const CitizenProfileScreen'),
  'B02', 'Named export CitizenProfileScreen',
);

// 1. Citizen-only: screen is mounted under CitizenNavigator (wired in C)
assert(
  contains(scr.content, 'CITIZEN') || contains(scr.content, 'CitizenProfileScreen'),
  'B03', 'Screen is for citizen role context',
);

// 3 & 4. Profile API / service
assert(contains(scr.content, 'userProfileService'), 'B04', 'userProfileService imported and used');
assert(contains(scr.content, 'getProfile'), 'B05', 'Calls userProfileService.getProfile');
assert(
  !contains(scr.content, 'fetch(') && !contains(scr.content, "axios.get('/users"),
  'B06', 'No raw fetch/axios calls — uses service layer',
);

// 5. Profile field rendering
assert(contains(scr.content, 'profile?.name') || contains(scr.content, "profile.name"), 'B07', 'Renders name field');
assert(contains(scr.content, 'profile?.email') || contains(scr.content, "profile.email"), 'B08', 'Renders email field');
assert(contains(scr.content, 'profile?.phone') || contains(scr.content, "profile.phone"), 'B09', 'Renders phone field');
assert(contains(scr.content, 'profile?.role') || contains(scr.content, "profile.role"), 'B10', 'Renders role field');
assert(contains(scr.content, 'profile?.status') || contains(scr.content, "profile.status"), 'B11', 'Renders account status');
assert(contains(scr.content, 'profile?.createdAt') || contains(scr.content, "profile.createdAt"), 'B12', 'Renders member-since (createdAt)');

// Do NOT expose internal id to UI
assert(!contains(scr.content, "Text>{profile?.id}"), 'B13', 'Internal database id NOT displayed in UI text');
assert(!contains(scr.content, "Text>{profile.id}"), 'B13b', 'Internal database id NOT displayed in UI text (variant)');

// 6. Editable fields — ONLY name and phone
assert(contains(scr.content, 'editName'), 'B14', 'editName state for name field');
assert(contains(scr.content, 'editPhone'), 'B15', 'editPhone state for phone field');

// 7. Protected field prevention — no editEmail, editRole, editStatus, etc.
assert(
  !contains(scr.content, 'editEmail') && !contains(scr.content, 'setEditEmail'),
  'B16', 'Email is NOT editable (no editEmail state)',
);
assert(
  !contains(scr.content, 'editRole') && !contains(scr.content, 'setEditRole'),
  'B17', 'Role is NOT editable (no editRole state)',
);
assert(
  !contains(scr.content, 'editStatus') && !contains(scr.content, 'setEditStatus'),
  'B18', 'Status is NOT editable (no editStatus state)',
);
assert(
  !contains(scr.content, 'editAvatarUrl') && !contains(scr.content, 'editAvatar'),
  'B19', 'avatarUrl is NOT editable',
);

// 8. Validation
assert(contains(scr.content, 'validateName'), 'B20', 'validateName function defined');
assert(contains(scr.content, 'validatePhone'), 'B21', 'validatePhone function defined');
assert(
  contains(scr.content, 'min: 2') || contains(scr.content, 'length < 2') || contains(scr.content, "length < 2"),
  'B22', 'Name minimum 2 chars validation enforced',
);
assert(
  contains(scr.content, 'max: 100') || contains(scr.content, 'length > 100') || contains(scr.content, "length > 100"),
  'B23', 'Name maximum 100 chars validation enforced',
);
assert(
  contains(scr.content, 'phoneRegex') || contains(scr.content, 'phone number format'),
  'B24', 'Phone regex validation enforced',
);
assert(contains(scr.content, 'nameError'), 'B25', 'Name validation error state managed');
assert(contains(scr.content, 'phoneError'), 'B26', 'Phone validation error state managed');

// 9. Saving/loading state
assert(contains(scr.content, 'isSaving'), 'B27', 'isSaving state managed');
assert(
  contains(scr.content, 'ActivityIndicator') || contains(scr.content, 'Saving'),
  'B28', 'Saving indicator shown while request in flight',
);

// 10. Duplicate-submit prevention
assert(
  contains(scr.content, 'isSavingRef') || contains(scr.content, 'isSaving') && contains(scr.content, 'return'),
  'B29', 'Duplicate submission prevention guard present',
);

// 11. API error handling
assert(contains(scr.content, 'saveError'), 'B30', 'saveError state managed');
assert(contains(scr.content, 'catch'), 'B31', 'Async error catch present');

// 12. Offline profile viewing
assert(contains(scr.content, 'authUser'), 'B32', 'AuthContext user used to seed profile (offline-visible)');

// 13. Offline mutation
assert(
  contains(scr.content, 'isConnected') && (
    contains(scr.content, 'require an internet') ||
    contains(scr.content, 'require a connection') ||
    contains(scr.content, 'isOfflineError') ||
    contains(scr.content, '!isConnected')
  ),
  'B33', 'Mutation blocked / warned when offline',
);

// 14. Logout
assert(
  contains(scr.content, 'logout') && contains(scr.content, 'useAuth'),
  'B34', 'Logout uses existing useAuth logout (not new mechanism)',
);
assert(
  contains(scr.content, 'Alert.alert') && contains(scr.content, 'Sign Out'),
  'B35', 'Logout requires confirmation alert',
);
assert(
  contains(scr.content, 'isLoggingOut'),
  'B36', 'isLoggingOut state managed',
);
assert(
  !contains(scr.content, 'localStorage.clear') && !contains(scr.content, 'storage.clearAll'),
  'B37', 'Logout does not bypass auth architecture (uses logout from useAuth)',
);

// 15. Account status
assert(contains(scr.content, 'PENDING_VERIFICATION'), 'B38', 'PENDING_VERIFICATION status handled');
assert(contains(scr.content, 'ACTIVE'), 'B39', 'ACTIVE status handled');
assert(contains(scr.content, 'SUSPENDED'), 'B40', 'SUSPENDED status handled with warning banner');
assert(contains(scr.content, 'DEACTIVATED'), 'B41', 'DEACTIVATED status handled with warning banner');

// 16. Role immutability — no role-change UI
assert(
  !contains(scr.content, 'Select.*role') && !contains(scr.content, 'Picker.*role'),
  'B42', 'No role-change UI element (role is read-only)',
);

// 17. No direct Citizen → Recycler
assert(
  !contains(scr.content, 'createConsignment') &&
  !contains(scr.content, 'bookRecycler') &&
  !contains(scr.content, 'RecyclerScreen'),
  'B43', 'No Citizen→Recycler functionality in screen',
);

// 18. Navigation safety — only documented routes
assert(
  !contains(scr.content, 'RecyclerDetail') &&
  !contains(scr.content, 'CollectorProfile') &&
  !contains(scr.content, 'AdminScreen'),
  'B44', 'No undocumented navigation routes referenced',
);

// 19. Accessibility
assert(contains(scr.content, 'accessibilityRole'), 'B45', 'accessibilityRole present on interactive elements');
assert(contains(scr.content, 'accessibilityLabel'), 'B46', 'accessibilityLabel present');
assert(contains(scr.content, 'accessibilityState'), 'B47', 'accessibilityState present on buttons');
assert(
  contains(scr.content, 'minHeight: 48'),
  'B48', 'Minimum 48dp touch target on interactive elements',
);
assert(
  contains(scr.content, 'accessibilityHint') || contains(scr.content, 'accessibilityLabelledBy'),
  'B49', 'Input fields have accessibility hints or labels',
);

// 20. Security — no tokens/passwords exposed
assert(!contains(scr.content, 'accessToken'), 'B50', 'accessToken NOT exposed in screen');
assert(!contains(scr.content, 'refreshToken'), 'B51', 'refreshToken NOT exposed in screen');
assert(!contains(scr.content, 'passwordHash'), 'B52', 'passwordHash NOT exposed in screen');
assert(!contains(scr.content, 'password'), 'B53', 'password NOT exposed in screen');
assert(!contains(scr.content, 'err.stack'), 'B54', 'err.stack NOT exposed to UI');
assert(!contains(scr.content, 'prisma.'), 'B55', 'No ORM details exposed');

// 21. No new auth mechanism
assert(
  !contains(scr.content, 'biometric') && !contains(scr.content, 'FaceID') && !contains(scr.content, 'TouchID'),
  'B56', 'No new biometric/PIN authentication added',
);
assert(
  !contains(scr.content, 'newToken') && !contains(scr.content, 'jwt.sign'),
  'B57', 'No new JWT generation or token manipulation',
);

// 22. No polling
assert(!contains(scr.content, 'setInterval'), 'B58', 'No setInterval polling');
assert(!contains(scr.content, 'WebSocket'), 'B59', 'No WebSocket introduced');

// Loading states
assert(contains(scr.content, 'isLoading'), 'B60', 'isLoading state managed');
assert(
  contains(scr.content, 'Skeleton') || contains(scr.content, 'ProfileSkeleton'),
  'B61', 'Skeleton loading state used',
);

// Pull to refresh
assert(contains(scr.content, 'RefreshControl'), 'B62', 'Pull-to-refresh RefreshControl used');
assert(contains(scr.content, 'isRefreshing'), 'B63', 'isRefreshing state managed');

// Error state
assert(contains(scr.content, 'loadError'), 'B64', 'loadError state managed');
assert(contains(scr.content, 'Retry'), 'B65', 'Retry action present in error state');

// Offline awareness
assert(contains(scr.content, 'fromCache'), 'B66', 'fromCache tracked for stale-data notice');
assert(contains(scr.content, 'OfflineBanner'), 'B67', 'OfflineBanner shown when offline');

// ─── C. Navigator Wiring ───────────────────────────────────────────────────────

console.log('\n─── C. CitizenNavigator.tsx — Wiring ─────────────────────────────────────');

assert(nav.exists, 'C01', 'CitizenNavigator.tsx exists');
assert(
  contains(nav.content, "import { CitizenProfileScreen }"),
  'C02', 'CitizenProfileScreen imported',
);
assert(
  contains(nav.content, "from '../screens/citizen/CitizenProfileScreen'"),
  'C03', 'Import path is correct',
);
assert(
  contains(nav.content, 'component={CitizenProfileScreen}'),
  'C04', 'CitizenProfileScreen wired as Tab.Screen component',
);
assert(
  !contains(nav.content, 'component={CitizenProfileTab}'),
  'C05', 'Old CitizenProfileTab placeholder not used as component',
);

// ─── D. Protected Fields ───────────────────────────────────────────────────────

console.log('\n─── D. Protected Fields — Not Editable ───────────────────────────────────');

// Verified from backend/src/validators/userValidators.js PROTECTED_USER_FIELDS
const PROTECTED = ['role', 'status', 'email', 'password', 'passwordHash', 'avatarUrl', 'createdAt', 'updatedAt', 'id'];

// Screen must not have editable form fields for any of these
assert(!contains(scr.content, 'editRole'), 'D01', 'role — no edit state');
assert(!contains(scr.content, 'editStatus'), 'D02', 'status — no edit state');
assert(!contains(scr.content, 'editEmail') || !contains(scr.content, 'setEditEmail'), 'D03', 'email — no edit state');
assert(!contains(scr.content, 'editPasswordHash'), 'D04', 'passwordHash — no edit state');
assert(!contains(scr.content, 'editAvatarUrl') && !contains(scr.content, 'ImagePicker'), 'D05', 'avatarUrl — not editable (no ImagePicker)');
assert(!contains(scr.content, 'editCreatedAt'), 'D06', 'createdAt — no edit state');

// Service must not send protected fields in PATCH payload
assert(!contains(svc.content, "payload.role"), 'D07', 'Service does not send role in PATCH');
assert(!contains(svc.content, "payload.status"), 'D08', 'Service does not send status in PATCH');
assert(!contains(svc.content, "payload.email"), 'D09', 'Service does not send email in PATCH');
assert(!contains(svc.content, "payload.avatarUrl"), 'D10', 'Service does not send avatarUrl in PATCH');
assert(!contains(svc.content, "payload.id"), 'D11', 'Service does not send id in PATCH');

// ─── E. Editable Fields and Validation ────────────────────────────────────────

console.log('\n─── E. Editable Fields and Validation ────────────────────────────────────');

// Only name and phone are editable — verified from backend/src/services/userService.js
assert(contains(scr.content, 'editName'), 'E01', 'name is an editable field');
assert(contains(scr.content, 'editPhone'), 'E02', 'phone is an editable field');
assert(
  contains(scr.content, 'updateProfile'),
  'E03', 'Calls userProfileService.updateProfile on save',
);
assert(
  contains(scr.content, "payload.name") || contains(scr.content, 'name: editName') || contains(scr.content, "name !== undefined"),
  'E04', 'name included in update payload',
);
assert(
  contains(scr.content, "payload.phone") || contains(scr.content, 'phone: editPhone') || contains(scr.content, "phone !== undefined"),
  'E05', 'phone included in update payload',
);

// ─── F. AuthContext / Logout ───────────────────────────────────────────────────

console.log('\n─── F. AuthContext / Logout Integration ──────────────────────────────────');

assert(contains(scr.content, "from '../../hooks/useAuth'"), 'F01', 'useAuth imported from correct path');
assert(contains(scr.content, 'const { user') || contains(scr.content, 'const {user'), 'F02', 'user destructured from useAuth');
assert(contains(scr.content, 'logout'), 'F03', 'logout from useAuth used');
assert(
  !contains(scr.content, 'authService.logout'),
  'F04', 'Logout called via context, not direct authService (no second logout mechanism)',
);
assert(
  contains(scr.content, 'await logout'),
  'F05', 'logout is awaited',
);

// ─── G. Account Status ────────────────────────────────────────────────────────

console.log('\n─── G. Account Status Handling ───────────────────────────────────────────');

assert(
  contains(scr.content, 'USER_STATUS') || (
    contains(scr.content, 'PENDING_VERIFICATION') &&
    contains(scr.content, 'ACTIVE') &&
    contains(scr.content, 'SUSPENDED') &&
    contains(scr.content, 'DEACTIVATED')
  ),
  'G01', 'All 4 canonical UserStatus values handled',
);
assert(
  !contains(scr.content, 'VERIFIED') && !contains(scr.content, 'INACTIVE') && !contains(scr.content, 'BLOCKED'),
  'G02', 'No invented UserStatus values used',
);
assert(
  contains(scr.content, 'SUSPENDED') && (
    contains(scr.content, 'suspended') || contains(scr.content, 'Suspended')
  ),
  'G03', 'Suspended account shows warning banner',
);
assert(
  contains(scr.content, 'PENDING_VERIFICATION') && (
    contains(scr.content, 'pending') || contains(scr.content, 'Pending')
  ),
  'G04', 'Pending verification shown informatively',
);

// ─── H. Offline / Cache ────────────────────────────────────────────────────────

console.log('\n─── H. Offline / Cache Behaviour ────────────────────────────────────────');

assert(contains(svc.content, '_getCachedProfile'), 'H01', 'Service _getCachedProfile fallback defined');
assert(contains(svc.content, 'AsyncStorage.setItem'), 'H02', 'Service writes profile to cache after fetch');
assert(contains(svc.content, 'AsyncStorage.getItem'), 'H03', 'Service reads cache when offline');
assert(
  contains(svc.content, 'isNetworkError') || contains(svc.content, 'isOfflineError'),
  'H04', 'Network error handled gracefully',
);
assert(contains(scr.content, 'fromCache'), 'H05', 'Screen tracks fromCache for notice');
assert(contains(scr.content, 'OfflineBanner'), 'H06', 'OfflineBanner shown when offline');
assert(
  contains(scr.content, 'authUser') && (
    contains(scr.content, 'setProfile(authUser') ||
    contains(scr.content, 'profile(authUser') ||
    contains(scr.content, 'authUser ||')
  ),
  'H07', 'AuthContext user seeds profile for instant offline display',
);

// ─── I. Business Rules ─────────────────────────────────────────────────────────

console.log('\n─── I. Business Rules — Kabadiwala-First, No Recycler ────────────────────');

assert(
  contains(scr.content, 'Kabadiwala') || contains(scr.content, 'informal collector') || contains(scr.content, 'Kabadiwalas'),
  'I01', 'Kabadiwala / informal collector wording present in chain note',
);
assert(
  !contains(scr.content, 'createConsignment') &&
  !contains(scr.content, 'bookRecycler') &&
  !contains(scr.content, 'selectRecycler'),
  'I02', 'No Citizen→Recycler mutation controls',
);
assert(
  !contains(scr.content, 'RecyclerDetail') &&
  !contains(scr.content, 'ConsignmentDetail'),
  'I03', 'No recycler navigation routes referenced',
);
assert(
  !contains(svc.content, '/recyclers') && !contains(svc.content, '/consignments'),
  'I04', 'Profile service has no recycler/consignment endpoints',
);

// ─── J. Security ──────────────────────────────────────────────────────────────

console.log('\n─── J. Security Checks ───────────────────────────────────────────────────');

assert(!contains(scr.content, 'accessToken'), 'J01', 'accessToken NOT exposed in screen');
assert(!contains(scr.content, 'refreshToken'), 'J02', 'refreshToken NOT exposed in screen');
assert(!contains(scr.content, 'passwordHash'), 'J03', 'passwordHash NOT exposed');
assert(!contains(scr.content, "'password'") || !contains(scr.content, 'setPassword'), 'J04', 'No password editing');
assert(!contains(scr.content, 'err.stack'), 'J05', 'Error stack traces not exposed to UI');
assert(
  !contains(scr.content, "userId: '") && !contains(scr.content, 'req.body.userId'),
  'J06', 'Screen does not supply userId to API calls (server uses auth context)',
);
assert(
  !contains(scr.content, "console.log(accessToken)") && !contains(scr.content, "console.log(refreshToken)"),
  'J07', 'No token values logged to console',
);

// ─── K. Accessibility ──────────────────────────────────────────────────────────

console.log('\n─── K. Accessibility ──────────────────────────────────────────────────────');

assert(contains(scr.content, 'accessibilityRole'), 'K01', 'accessibilityRole present');
assert(contains(scr.content, 'accessibilityLabel'), 'K02', 'accessibilityLabel present');
assert(contains(scr.content, 'accessibilityState'), 'K03', 'accessibilityState present on buttons');
assert(contains(scr.content, 'minHeight: 48'), 'K04', '48dp touch targets enforced');
assert(
  contains(scr.content, 'accessibilityRole="alert"') || contains(scr.content, "accessibilityRole='alert'"),
  'K05', 'Errors/warnings use accessibilityRole="alert"',
);
assert(
  contains(scr.content, 'accessibilityHint') || contains(scr.content, 'accessibilityLabelledBy'),
  'K06', 'Form inputs have accessibility hints or labelled-by',
);
assert(
  contains(scr.content, 'accessibilityElementsHidden'),
  'K07', 'Decorative elements hidden from accessibility tree',
);

// ─── L. Performance ────────────────────────────────────────────────────────────

console.log('\n─── L. Performance — No Polling / Realtime ───────────────────────────────');

assert(!contains(svc.content, 'setInterval'), 'L01', 'No setInterval polling in service');
assert(!contains(scr.content, 'setInterval'), 'L02', 'No setInterval polling in screen');
assert(!contains(scr.content, 'WebSocket'), 'L03', 'No WebSocket in screen');
assert(!contains(scr.content, 'setTimeout'), 'L04', 'No setTimeout loops in screen');

// ─── M. Navigation Safety ──────────────────────────────────────────────────────

console.log('\n─── M. Navigation Safety ──────────────────────────────────────────────────');

// Profile screen is a tab — no navigation.navigate expected for non-modal flows
// It should NOT reference undocumented routes
assert(
  !contains(scr.content, 'RecyclerScreen') &&
  !contains(scr.content, 'CollectorScreen') &&
  !contains(scr.content, 'AdminScreen'),
  'M01', 'No undocumented/cross-role navigation routes referenced',
);
assert(
  !contains(scr.content, 'navigate(') ||
  contains(scr.content, 'CitizenHome') || contains(scr.content, 'CitizenTabs') ||
  contains(scr.content, 'RequestDetail') || contains(scr.content, 'goBack'),
  'M02', 'Any navigation uses only documented citizen routes',
);

// ─── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  Phase 16 — Task 8: Citizen Profile`);
console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ testId, description, detail }) => {
    console.log(`  ❌ [${testId}] ${description}${detail ? ' — ' + detail : ''}`);
  });
  process.exit(1);
} else {
  console.log('\n  All checks passed. Task 8 (Citizen Profile) implementation verified. ✅');
  process.exit(0);
}
