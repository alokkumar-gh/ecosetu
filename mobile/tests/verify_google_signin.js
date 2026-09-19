// EcoSetu Native Google Sign-In & Firebase Auth Verification Suite
// Phase 19 Task 25: Proper Native Google Sign-In + Firebase Authentication

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Native Google Sign-In & Firebase Authentication Verification');
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
const packageJson = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'package.json'), 'utf8'));
const firebaseAuthServiceCode = fs.readFileSync(path.join(mobileRoot, 'src/services/firebaseAuthService.ts'), 'utf8');
const loginScreenCode = fs.readFileSync(path.join(mobileRoot, 'src/screens/auth/LoginScreen.tsx'), 'utf8');
const authServiceCode = fs.readFileSync(path.join(mobileRoot, 'src/services/authService.js'), 'utf8');
const rootNavCode = fs.readFileSync(path.join(mobileRoot, 'src/navigation/RootNavigator.tsx'), 'utf8');
const googleServicesJson = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'android/app/google-services.json'), 'utf8'));
const enLocale = fs.readFileSync(path.join(mobileRoot, 'src/i18n/locales/en.ts'), 'utf8');
const hiLocale = fs.readFileSync(path.join(mobileRoot, 'src/i18n/locales/hi.ts'), 'utf8');
const mrLocale = fs.readFileSync(path.join(mobileRoot, 'src/i18n/locales/mr.ts'), 'utf8');
const orLocale = fs.readFileSync(path.join(mobileRoot, 'src/i18n/locales/or.ts'), 'utf8');

console.log('─── 1. Dependency & Native Architecture Verification ─────────────────');

it('native Google Sign-In dependency exists in package.json', () => {
  assert(
    packageJson.dependencies && packageJson.dependencies['@react-native-google-signin/google-signin'],
    'Must declare @react-native-google-signin/google-signin in dependencies'
  );
});

it('no fatal dynamic require of an unbundled Firebase module', () => {
  assert(
    !firebaseAuthServiceCode.includes("require('@react-native-firebase/auth')"),
    'Must not dynamically require unbundled @react-native-firebase/auth'
  );
});

console.log('\n─── 2. Google Sign-In Initialization & Configuration ────────────────');

it('initialization exists with webClientId from google-services.json', () => {
  assert(firebaseAuthServiceCode.includes('GoogleSignin.configure'), 'Must call GoogleSignin.configure');
  assert(firebaseAuthServiceCode.includes('webClientId'), 'Must configure webClientId');
  const oauthClients = googleServicesJson.client[0].oauth_client;
  const webClient = oauthClients.find(c => c.client_type === 3);
  assert(webClient && webClient.client_id, 'Web Client ID (client_type: 3) must exist in google-services.json');
  assert(
    firebaseAuthServiceCode.includes(webClient.client_id),
    'firebaseAuthService must use the authorized web client ID'
  );
});

console.log('\n─── 3. Google Login Execution & Token Flow ───────────────────────────');

it('Google button exists on LoginScreen with proper handler', () => {
  assert(loginScreenCode.includes('handleGoogleSignIn'), 'Must define handleGoogleSignIn in LoginScreen');
  assert(loginScreenCode.includes('continueWithGoogle'), 'Must use continueWithGoogle i18n label');
  assert(loginScreenCode.includes('signInWithGoogle'), 'Must call signInWithGoogle service method');
});

it('loading state exists and shows indicator during Google authentication', () => {
  assert(loginScreenCode.includes('isGoogleLoading'), 'Must track isGoogleLoading state');
  assert(loginScreenCode.includes('ActivityIndicator'), 'Must render ActivityIndicator while Google auth is pending');
});

it('duplicate tap protection exists on Google button', () => {
  assert(
    loginScreenCode.includes('disabled={isGoogleLoading || isLoading}'),
    'Must disable button while Google or Email auth is in progress'
  );
});

it('ID token flow exists with Google Play Services check', () => {
  assert(firebaseAuthServiceCode.includes('GoogleSignin.hasPlayServices'), 'Must check Google Play Services');
  assert(firebaseAuthServiceCode.includes('GoogleSignin.signIn'), 'Must trigger native account chooser');
  assert(firebaseAuthServiceCode.includes('userInfo.idToken') || firebaseAuthServiceCode.includes('getTokens'), 'Must retrieve ID token');
});

it('Firebase credential flow exists to bridge Google token to Firebase', () => {
  assert(
    firebaseAuthServiceCode.includes('exchangeGoogleCredentialForFirebase') || firebaseAuthServiceCode.includes('signInWithCredential'),
    'Must support Firebase credential exchange'
  );
});

it('backend /auth/firebase-login integration exists and passes token', () => {
  assert(authServiceCode.includes('/auth/firebase-login'), 'authService must post to /auth/firebase-login');
  assert(authServiceCode.includes('loginWithFirebase'), 'authService must provide loginWithFirebase method');
  assert(loginScreenCode.includes('loginWithFirebase'), 'LoginScreen must call loginWithFirebase upon token receipt');
});

console.log('\n─── 4. Error Safety & Resilience ─────────────────────────────────────');

it('cancellation handling exists without throwing uncaught exceptions', () => {
  assert(firebaseAuthServiceCode.includes('SIGN_IN_CANCELLED') || firebaseAuthServiceCode.includes('cancelled'), 'Must handle cancellation');
  const cancelMsg = firebaseAuthServiceCode.includes('Sign-in was cancelled');
  assert(cancelMsg, 'Must map cancellation to friendly message');
});

it('developer error handling exists for SHA-1 / configuration mismatch', () => {
  assert(firebaseAuthServiceCode.includes('DEVELOPER_ERROR') || firebaseAuthServiceCode.includes('10'), 'Must capture Developer Error 10');
  assert(firebaseAuthServiceCode.includes('Developer Error 10') || firebaseAuthServiceCode.includes('configuration error'), 'Must provide clear diagnostic guidance');
});

it('missing configuration handling exists gracefully', () => {
  assert(firebaseAuthServiceCode.includes('PLAY_SERVICES_NOT_AVAILABLE'), 'Must handle missing Play Services');
  assert(firebaseAuthServiceCode.includes('MISSING_ID_TOKEN'), 'Must handle missing ID token');
});

console.log('\n─── 5. Security & Authoritative Role Protection ──────────────────────');

it('no token logging in console or debug streams', () => {
  assert(!firebaseAuthServiceCode.includes('console.log(idToken'), 'Must never console.log ID token');
  assert(!firebaseAuthServiceCode.includes('console.log(googleIdToken'), 'Must never console.log Google ID token');
  assert(!firebaseAuthServiceCode.includes('console.log(tokens'), 'Must never console.log raw token bundle');
  assert(!loginScreenCode.includes('console.log(idToken'), 'Must never log ID token in UI component');
});

it('no secret logging in source code', () => {
  assert(!firebaseAuthServiceCode.includes('console.log(client_secret'), 'Must never log client secrets');
  assert(!loginScreenCode.includes('client_secret'), 'No client secrets on login screen');
});

it('role is not client-selectable during Google authentication', () => {
  assert(!loginScreenCode.includes('selectRole'), 'Login screen must not provide role selection');
  assert(!loginScreenCode.includes('RoleSelector'), 'No RoleSelector in LoginScreen');
  assert(rootNavCode.includes('switch (user.role)'), 'RootNavigator must authoritative route by server-returned role');
});

console.log('\n─── 6. Preservation of Existing Auth & Localization ─────────────────');

it('existing authentication methods remain intact (Email & Phone OTP)', () => {
  assert(loginScreenCode.includes('handleLogin'), 'Email login handler must exist');
  assert(loginScreenCode.includes('<PhoneAuthModal'), 'PhoneAuthModal must be mounted');
  assert(firebaseAuthServiceCode.includes('sendPhoneOtp'), 'Phone OTP send method must be preserved');
  assert(firebaseAuthServiceCode.includes('signInWithEmail'), 'Email signIn method must be preserved');
});

it('i18n keys exist across en, hi, mr, and or', () => {
  assert(enLocale.includes('continueWithGoogle'), 'en must have continueWithGoogle');
  assert(hiLocale.includes('continueWithGoogle'), 'hi must have continueWithGoogle');
  assert(mrLocale.includes('continueWithGoogle'), 'mr must have continueWithGoogle');
  assert(orLocale.includes('continueWithGoogle'), 'or must have continueWithGoogle');
});

console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  VERIFICATION RESULTS: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
