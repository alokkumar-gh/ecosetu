// EcoSetu Mobile Firebase Auth & Role Routing Verification Test Suite
// Phase 19 Task 20: Firebase Auth + Role-Aware UI

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Mobile Firebase Authentication & Role Routing Verification');
console.log('════════════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

const mobileRoot = path.resolve(__dirname, '..');
const loginScreenCode = fs.readFileSync(path.join(mobileRoot, 'src/screens/auth/LoginScreen.tsx'), 'utf8');
const rootNavigatorCode = fs.readFileSync(path.join(mobileRoot, 'src/navigation/RootNavigator.tsx'), 'utf8');
const phoneModalCode = fs.readFileSync(path.join(mobileRoot, 'src/components/auth/PhoneAuthModal.tsx'), 'utf8');
const pendingScreenCode = fs.readFileSync(path.join(mobileRoot, 'src/screens/auth/PendingVerificationScreen.tsx'), 'utf8');
const suspendedScreenCode = fs.readFileSync(path.join(mobileRoot, 'src/screens/auth/AccountSuspendedScreen.tsx'), 'utf8');
const deactivatedScreenCode = fs.readFileSync(path.join(mobileRoot, 'src/screens/auth/AccountDeactivatedScreen.tsx'), 'utf8');
const firebaseAuthServiceCode = fs.readFileSync(path.join(mobileRoot, 'src/services/firebaseAuthService.ts'), 'utf8');
const authServiceCode = fs.readFileSync(path.join(mobileRoot, 'src/services/authService.js'), 'utf8');

console.log('─── 1. Login Screen Layout & Auth Providers (Step 4 & 5) ─────────────');

it('LoginScreen renders Continue with Google button', () => {
  assert(loginScreenCode.includes('continueWithGoogle'), 'Must use continueWithGoogle translation key');
  assert(loginScreenCode.includes('handleGoogleSignIn'), 'Must wire handleGoogleSignIn handler');
});

it('LoginScreen renders Email and Password inputs and Sign In button', () => {
  assert(loginScreenCode.includes('keyboardType="email-address"'), 'Email input must exist');
  assert(loginScreenCode.includes('secureTextEntry'), 'Password input must exist');
  assert(loginScreenCode.includes('handleLogin'), 'Must wire handleLogin handler');
});

it('LoginScreen renders Continue with Phone trigger and PhoneAuthModal', () => {
  assert(loginScreenCode.includes('continueWithPhone'), 'Must use continueWithPhone translation key');
  assert(loginScreenCode.includes('<PhoneAuthModal'), 'Must mount PhoneAuthModal');
  assert(loginScreenCode.includes('setPhoneModalVisible(true)'), 'Must trigger phone modal');
});

it('PhoneAuthModal implements two-step verification (Phone -> 6-digit OTP)', () => {
  assert(phoneModalCode.includes("step === 'PHONE'"), 'Must handle PHONE step');
  assert(phoneModalCode.includes("step === 'OTP'"), 'Must handle OTP step');
  assert(phoneModalCode.includes('sendPhoneOtp'), 'Must call sendPhoneOtp');
  assert(phoneModalCode.includes('loginWithFirebase'), 'Must call loginWithFirebase upon OTP verify');
  assert(phoneModalCode.includes('maxLength={6}'), 'Must restrict OTP input to 6 digits');
});

console.log('\n─── 2. Safe Error Mapping & Zero Raw Firebase Error Leaks ────────────');

it('firebaseAuthService safely maps Firebase error codes to user-friendly messages', () => {
  assert(firebaseAuthServiceCode.includes('auth/invalid-email'), 'Must map auth/invalid-email');
  assert(firebaseAuthServiceCode.includes('auth/user-not-found'), 'Must map auth/user-not-found');
  assert(firebaseAuthServiceCode.includes('auth/invalid-verification-code'), 'Must map auth/invalid-verification-code');
  assert(firebaseAuthServiceCode.includes('auth/code-expired'), 'Must map auth/code-expired');
  assert(firebaseAuthServiceCode.includes('auth/too-many-requests'), 'Must map auth/too-many-requests');
});

it('Raw stack traces or internal Firebase error objects are never rendered directly', () => {
  assert(loginScreenCode.includes('mapFirebaseError'), 'LoginScreen must use mapFirebaseError');
  assert(phoneModalCode.includes('mapFirebaseError'), 'PhoneAuthModal must use mapFirebaseError');
});

console.log('\n─── 3. Role-Based Routing & Status Gating (Step 10, 11, 12) ───────────');

it('RootNavigator dispatches Citizen to CitizenNavigator', () => {
  assert(rootNavigatorCode.includes('case ROLES.CITIZEN:'), 'Must handle ROLES.CITIZEN');
  assert(rootNavigatorCode.includes('<CitizenNavigator />'), 'Must render CitizenNavigator');
});

it('RootNavigator dispatches Informal Collector to CollectorNavigator', () => {
  assert(rootNavigatorCode.includes('case ROLES.INFORMAL_COLLECTOR:'), 'Must handle ROLES.INFORMAL_COLLECTOR');
  assert(rootNavigatorCode.includes('<CollectorNavigator />'), 'Must render CollectorNavigator');
});

it('RootNavigator dispatches Recycler to RecyclerNavigator', () => {
  assert(rootNavigatorCode.includes('case ROLES.RECYCLER:'), 'Must handle ROLES.RECYCLER');
  assert(rootNavigatorCode.includes('<RecyclerNavigator />'), 'Must render RecyclerNavigator');
});

it('RootNavigator dispatches Admin to AdminNavigator', () => {
  assert(rootNavigatorCode.includes('case ROLES.ADMIN:'), 'Must handle ROLES.ADMIN');
  assert(rootNavigatorCode.includes('<AdminNavigator />'), 'Must render AdminNavigator');
});

it('RootNavigator gates PENDING_VERIFICATION collectors and recyclers with PendingVerificationScreen', () => {
  assert(rootNavigatorCode.includes("user.status === 'PENDING_VERIFICATION'"), 'Must check PENDING_VERIFICATION');
  assert(rootNavigatorCode.includes('<PendingVerificationScreen'), 'Must render PendingVerificationScreen');
});

it('RootNavigator gates SUSPENDED users with AccountSuspendedScreen', () => {
  assert(rootNavigatorCode.includes("user.status === 'SUSPENDED'"), 'Must check SUSPENDED status');
  assert(rootNavigatorCode.includes('<AccountSuspendedScreen />'), 'Must render AccountSuspendedScreen');
});

it('RootNavigator gates DEACTIVATED users with AccountDeactivatedScreen', () => {
  assert(rootNavigatorCode.includes("user.status === 'DEACTIVATED'"), 'Must check DEACTIVATED status');
  assert(rootNavigatorCode.includes('<AccountDeactivatedScreen />'), 'Must render AccountDeactivatedScreen');
});

console.log('\n─── 4. Session Persistence & Logout (Step 13) ─────────────────────────');

it('authService.loginWithFirebase persists session tokens and profile', () => {
  assert(authServiceCode.includes('loginWithFirebase'), 'Must implement loginWithFirebase');
  assert(authServiceCode.includes('/auth/firebase-login'), 'Must post to /auth/firebase-login');
  assert(authServiceCode.includes('STORAGE_KEYS.ACCESS_TOKEN'), 'Must persist access token');
  assert(authServiceCode.includes('STORAGE_KEYS.REFRESH_TOKEN'), 'Must persist refresh token');
  assert(authServiceCode.includes('STORAGE_KEYS.USER_PROFILE'), 'Must persist user profile');
});

it('authService.logout clears session credentials and user domain caches', () => {
  assert(authServiceCode.includes('clearAllUserCaches'), 'Must clear caches on logout');
  assert(authServiceCode.includes('removeItem(STORAGE_KEYS.ACCESS_TOKEN)'), 'Must remove access token');
  assert(authServiceCode.includes('removeItem(STORAGE_KEYS.USER_PROFILE)'), 'Must remove user profile');
});

console.log('\n─── 5. Multilingual Localization Parity (en, hi, mr, or) ─────────────');

const locales = ['en', 'hi', 'mr', 'or'];
const requiredAuthKeys = [
  'continueWithGoogle',
  'continueWithPhone',
  'or',
  'sendOtp',
  'verifyOtp',
  'resendOtp',
  'invalidPhone',
  'invalidOtp',
  'invalidEmail',
  'accountPending',
  'accountSuspended',
  'accountDeactivated',
];

locales.forEach((loc) => {
  it(`Locale [${loc}] defines all 12 Firebase auth and status translation keys`, () => {
    const locContent = fs.readFileSync(path.join(mobileRoot, `src/i18n/locales/${loc}.ts`), 'utf8');
    requiredAuthKeys.forEach((key) => {
      assert(locContent.includes(`${key}:`), `Missing translation key: ${key} in ${loc}`);
    });
  });
});

console.log('\n─── 6. Security Scans: No Secrets in Source Code ──────────────────────');

it('Zero Google Maps API keys (AIza*) hardcoded in mobile/src', () => {
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (/\.(ts|tsx|js|json)$/.test(f)) {
        const content = fs.readFileSync(full, 'utf8');
        assert(!/AIza[0-9A-Za-z-_]{35}/.test(content), `Found hardcoded AIza key in ${full}`);
      }
    }
  }
  scanDir(path.join(mobileRoot, 'src'));
});

it('Zero private keys or JWT secrets hardcoded in mobile/src', () => {
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (/\.(ts|tsx|js)$/.test(f)) {
        const content = fs.readFileSync(full, 'utf8');
        assert(!content.includes('BEGIN PRIVATE KEY'), `Found private key in ${full}`);
        assert(!content.includes('JWT_ACCESS_SECRET='), `Found JWT secret in ${full}`);
      }
    }
  }
  scanDir(path.join(mobileRoot, 'src'));
});

console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  MOBILE FIREBASE AUTH RESULTS: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
