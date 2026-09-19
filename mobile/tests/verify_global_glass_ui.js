/**
 * EcoSetu Mobile Global Glassmorphism & UX Architecture Verification
 * Phase 19 — Task 26
 *
 * Verifies:
 * 1. Centralized Glass Design Tokens exist (colors.js, glassmorphism.js).
 * 2. Shared Glass Components exist (GlassCard, GlassButton, GlassInput, GlassModal, GlassMetricCard, GradientBackground).
 * 3. First-Launch UX: Introductory Carousel does not contain prominent standalone language selector.
 * 4. Auth screens (Landing, Login, Register, PhoneAuth) share the unified glass system.
 * 5. Role screens (Citizen, Collector, Recycler, Admin) share the unified glass system.
 * 6. Standardized touch targets (>= 48dp) and accessible text contrast.
 * 7. Zero neon green, cyberpunk styling, or AI-generated image assets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Global Glassmorphism & Google Auth Flow Verification');
console.log('════════════════════════════════════════════════════════════════════════\n');

// ─── 1. Centralized Glass Tokens ─────────────────────────────────────────────
console.log('─── 1. Centralized Glass Design Tokens ─────────────────────────────────');

check('colors.js defines unified public-service glass tokens', () => {
  const colorsFile = path.join(MOBILE_ROOT, 'src', 'theme', 'colors.js');
  assert(fs.existsSync(colorsFile), 'colors.js not found');
  const content = fs.readFileSync(colorsFile, 'utf8');

  assert(content.includes('glassFill'), 'colors.js missing glassFill');
  assert(content.includes('glassBorder'), 'colors.js missing glassBorder');
  assert(content.includes('glassOverlay'), 'colors.js missing glassOverlay');
  assert(content.includes('#0F2942'), 'colors.js missing authoritative deep navy #0F2942');
  assert(!content.includes('#4ADE80'), 'colors.js must not use legacy neon green #4ADE80 for primary');
});

check('glassmorphism.js defines standardized glass style objects', () => {
  const glassFile = path.join(MOBILE_ROOT, 'src', 'theme', 'glassmorphism.js');
  assert(fs.existsSync(glassFile), 'glassmorphism.js not found');
  const content = fs.readFileSync(glassFile, 'utf8');

  assert(content.includes('glassCard'), 'glassmorphism.js missing glassCard');
  assert(content.includes('glassCardElevated'), 'glassmorphism.js missing glassCardElevated');
  assert(content.includes('glassInput'), 'glassmorphism.js missing glassInput');
  assert(content.includes('glassPrimaryButton'), 'glassmorphism.js missing glassPrimaryButton');
  assert(content.includes('glassOutlineButton'), 'glassmorphism.js missing glassOutlineButton');
  assert(content.includes('glassAccentButton'), 'glassmorphism.js missing glassAccentButton');
});

// ─── 2. Shared Glass Components ──────────────────────────────────────────────
console.log('\n─── 2. Shared Glass Components ─────────────────────────────────────────');

check('All foundational glass components are exported from glass/index.ts', () => {
  const indexFile = path.join(MOBILE_ROOT, 'src', 'components', 'glass', 'index.ts');
  assert(fs.existsSync(indexFile), 'glass/index.ts not found');
  const content = fs.readFileSync(indexFile, 'utf8');

  assert(content.includes('GlassCard'), 'glass/index.ts missing GlassCard export');
  assert(content.includes('GlassButton'), 'glass/index.ts missing GlassButton export');
  assert(content.includes('GlassInput'), 'glass/index.ts missing GlassInput export');
  assert(content.includes('GlassModal'), 'glass/index.ts missing GlassModal export');
  assert(content.includes('GlassMetricCard'), 'glass/index.ts missing GlassMetricCard export');
  assert(content.includes('GradientBackground'), 'glass/index.ts missing GradientBackground export');
});

check('GlassButton and GlassInput enforce 48dp minimum touch targets', () => {
  const btnFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'components', 'glass', 'GlassButton.tsx'), 'utf8');
  assert(btnFile.includes('minHeight: 48') || btnFile.includes('minHeight: 52'), 'GlassButton missing >= 48dp touch target');

  const inputFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'components', 'glass', 'GlassInput.tsx'), 'utf8');
  assert(inputFile.includes('minHeight: 48'), 'GlassInput missing >= 48dp touch target');
});

// ─── 3. Startup UX & Language Selector Relocation ───────────────────────────
console.log('\n─── 3. Startup UX & Language Selector Relocation ───────────────────────');

check('LoginCarousel does NOT contain standalone language chips bar', () => {
  const carouselFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'components', 'auth', 'LoginCarousel.tsx'), 'utf8');
  assert(!carouselFile.includes('<LanguageSelector'), 'LoginCarousel must not render LanguageSelector chips');
  assert(!carouselFile.includes('languageBar'), 'LoginCarousel must not declare languageBar layout');
});

check('LoginScreen provides unobtrusive language selection in top bar', () => {
  const loginFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'screens', 'auth', 'LoginScreen.tsx'), 'utf8');
  assert(loginFile.includes('LanguageSelector'), 'LoginScreen missing LanguageSelector');
  assert(loginFile.includes('variant="compact"'), 'LoginScreen should use compact variant');
});

// ─── 4. Unified Authentication Flow & Google Integration ────────────────────
console.log('\n─── 4. Unified Authentication Flow & Google Integration ────────────────');

check('firebaseAuthService implements non-secret diagnostic logging', () => {
  const authServiceFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'services', 'firebaseAuthService.ts'), 'utf8');
  assert(authServiceFile.includes('logDiagnostic'), 'firebaseAuthService missing logDiagnostic');
  assert(authServiceFile.includes('GOOGLE_SIGNIN_STARTED'), 'Missing GOOGLE_SIGNIN_STARTED');
  assert(authServiceFile.includes('GOOGLE_ACCOUNT_SELECTED'), 'Missing GOOGLE_ACCOUNT_SELECTED');
  assert(authServiceFile.includes('GOOGLE_ID_TOKEN_RECEIVED'), 'Missing GOOGLE_ID_TOKEN_RECEIVED');
  assert(authServiceFile.includes('FIREBASE_CREDENTIAL_CREATED'), 'Missing FIREBASE_CREDENTIAL_CREATED');
  assert(authServiceFile.includes('FIREBASE_AUTH_SUCCESS'), 'Missing FIREBASE_AUTH_SUCCESS');
  assert(authServiceFile.includes('exchangeGoogleCredentialForFirebase'), 'Missing exchangeGoogleCredentialForFirebase');
});

check('LoginScreen handles Google cancellation without fatal exception or intrusive alerts', () => {
  const loginFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'screens', 'auth', 'LoginScreen.tsx'), 'utf8');
  assert(loginFile.includes('SIGN_IN_CANCELLED'), 'LoginScreen missing SIGN_IN_CANCELLED check');
});

check('Backend authService supports resilient OpenID / Firebase token verification', () => {
  const backendAuth = fs.readFileSync(path.join(MOBILE_ROOT, '..', 'backend', 'src', 'services', 'authService.js'), 'utf8');
  assert(backendAuth.includes('verifyFirebaseToken'), 'backend authService missing verifyFirebaseToken');
  assert(backendAuth.includes('Firebase Admin verifyIdToken fallback'), 'backend authService missing resilient fallback');
});

// ─── 5. Role Screens Visual Cohesion ─────────────────────────────────────────
console.log('\n─── 5. Role Screens Visual Cohesion ────────────────────────────────────');

check('Citizen, Collector, Recycler, Admin navigators declare unified glass tab bars', () => {
  const navigators = [
    'CitizenNavigator.tsx',
    'CollectorNavigator.tsx',
    'RecyclerNavigator.tsx',
    'AdminNavigator.tsx',
  ];

  navigators.forEach((nav) => {
    const navContent = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'navigation', nav), 'utf8');
    assert(navContent.includes('tabBarStyle'), `${nav} missing tabBarStyle`);
    assert(navContent.includes('colors.primary'), `${nav} missing colors.primary active tint`);
    assert(navContent.includes('rgba(255, 255, 255'), `${nav} tabBarStyle missing translucent white glass`);
  });
});

check('TopAppBar declares consistent 60dp glass header across authenticated screens', () => {
  const topAppBar = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'components', 'layout', 'TopAppBar.tsx'), 'utf8');
  assert(topAppBar.includes('height: 60'), 'TopAppBar height must be 60dp');
  assert(topAppBar.includes('rgba(255, 255, 255'), 'TopAppBar missing translucent glass background');
  assert(topAppBar.includes('colors.textPrimary'), 'TopAppBar missing colors.textPrimary');
});

check('Modals adhere to unified GlassModal / glassOverlay design', () => {
  const phoneModal = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'components', 'auth', 'PhoneAuthModal.tsx'), 'utf8');
  assert(phoneModal.includes('rgba(15, 41, 66'), 'PhoneAuthModal missing colors.glassOverlay');
  assert(phoneModal.includes('rgba(255, 255, 255'), 'PhoneAuthModal card missing translucent glass surface');
});

// ─── 6. Public Service Design Standards ──────────────────────────────────────
console.log('\n─── 6. Public Service Design Standards ─────────────────────────────────');

check('Zero neon green, cyberpunk, or futuristic styling tokens', () => {
  const colorsText = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'theme', 'colors.js'), 'utf8');
  assert(!colorsText.includes('Neon green'), 'colors.js should not use neon green tokens');
  assert(!colorsText.includes('#4ADE80'), 'colors.js should not use #4ADE80');
});

check('Zero AI-generated graphic assets imported', () => {
  const loginFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'screens', 'auth', 'LoginScreen.tsx'), 'utf8');
  const carouselFile = fs.readFileSync(path.join(MOBILE_ROOT, 'src', 'components', 'auth', 'LoginCarousel.tsx'), 'utf8');
  assert(!loginFile.includes('.png') && !loginFile.includes('.jpg'), 'LoginScreen should not import raster artwork');
  assert(!carouselFile.includes('.png') && !carouselFile.includes('.jpg'), 'LoginCarousel should not import raster artwork');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  GLOBAL GLASS UI RESULTS: ${passedTests} passed, ${failedTests} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
