// EcoSetu Government-Grade Login Carousel & Landing Experience Verification
// Phase 19 Task 21 Verification Suite

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Government-Grade Login Carousel & Landing Experience Test');
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
const carouselPath = path.join(mobileRoot, 'src/components/auth/LoginCarousel.tsx');
const landingPath = path.join(mobileRoot, 'src/screens/auth/LandingScreen.tsx');
const loginPath = path.join(mobileRoot, 'src/screens/auth/LoginScreen.tsx');
const rootNavPath = path.join(mobileRoot, 'src/navigation/RootNavigator.tsx');
const enPath = path.join(mobileRoot, 'src/i18n/locales/en.ts');
const hiPath = path.join(mobileRoot, 'src/i18n/locales/hi.ts');
const mrPath = path.join(mobileRoot, 'src/i18n/locales/mr.ts');
const orPath = path.join(mobileRoot, 'src/i18n/locales/or.ts');
const pkgPath = path.join(mobileRoot, 'package.json');

const carouselCode = fs.readFileSync(carouselPath, 'utf8');
const landingCode = fs.readFileSync(landingPath, 'utf8');
const loginCode = fs.readFileSync(loginPath, 'utf8');
const rootNavCode = fs.readFileSync(rootNavPath, 'utf8');
const pkgCode = fs.readFileSync(pkgPath, 'utf8');

console.log('─── 1. Carousel Rendering & Structure (Tests 1 - 5) ──────────────────');

it('1. carousel renders (LoginCarousel component exists and declares carousel container)', () => {
  assert(carouselCode.includes('testID="login-carousel"'), 'Must define login-carousel testID');
  assert(carouselCode.includes('export const LoginCarousel'), 'Must export LoginCarousel component');
});

it('2. all slides exist (4 informational slides defined)', () => {
  assert(carouselCode.includes("'slide-1'"), 'Slide 1 must exist');
  assert(carouselCode.includes("'slide-2'"), 'Slide 2 must exist');
  assert(carouselCode.includes("'slide-3'"), 'Slide 3 must exist');
  assert(carouselCode.includes("'slide-4'"), 'Slide 4 must exist');
});

it('3. slide titles/subtitles exist (localized titles and subtitles for all 4 slides)', () => {
  assert(carouselCode.includes('auth.slide1Title'), 'Slide 1 title key must exist');
  assert(carouselCode.includes('auth.slide1Subtitle'), 'Slide 1 subtitle key must exist');
  assert(carouselCode.includes('auth.slide2Title'), 'Slide 2 title key must exist');
  assert(carouselCode.includes('auth.slide2Subtitle'), 'Slide 2 subtitle key must exist');
  assert(carouselCode.includes('auth.slide3Title'), 'Slide 3 title key must exist');
  assert(carouselCode.includes('auth.slide3Subtitle'), 'Slide 3 subtitle key must exist');
  assert(carouselCode.includes('auth.slide4Title'), 'Slide 4 title key must exist');
  assert(carouselCode.includes('auth.slide4Subtitle'), 'Slide 4 subtitle key must exist');
});

it('4. pagination exists (pagination indicators track active slide)', () => {
  assert(carouselCode.includes('paginationRow'), 'Pagination indicator row must exist');
  assert(carouselCode.includes('dotActive'), 'Active dot style must exist');
  assert(carouselCode.includes('dotInactive'), 'Inactive dot style must exist');
});

it('5. swipe/navigation controls exist (horizontal paging and forward controls)', () => {
  assert(carouselCode.includes('pagingEnabled'), 'ScrollView must have pagingEnabled');
  assert(carouselCode.includes('horizontal'), 'ScrollView must have horizontal prop');
  assert(carouselCode.includes('goToNextSlide'), 'Forward navigation control must exist');
});

console.log('\n─── 2. Carousel Interaction & Persistence (Tests 6 - 9) ──────────────');

it('6. Skip works (Skip action wired to skip button and triggers completion callback)', () => {
  assert(carouselCode.includes('handleSkip'), 'handleSkip function must exist');
  assert(carouselCode.includes("auth.skip"), 'Must use auth.skip key');
  assert(landingCode.includes('onSkip={handleFinishCarousel}'), 'LandingScreen must wire onSkip');
});

it('7. Continue/Get Started works (Action button renders Get Started on last slide)', () => {
  assert(carouselCode.includes("auth.getStarted"), 'Must use auth.getStarted key');
  assert(carouselCode.includes("auth.next"), 'Must use auth.next key');
  assert(landingCode.includes('onComplete={handleFinishCarousel}'), 'LandingScreen must wire onComplete');
});

it('8. carousel completion persists (AsyncStorage saves CAROUSEL_COMPLETED flag)', () => {
  assert(landingCode.includes('CAROUSEL_COMPLETED'), 'Must reference CAROUSEL_COMPLETED constant');
  assert(landingCode.includes("AsyncStorage.setItem"), 'Must persist completion flag in AsyncStorage');
});

it('9. returning users are not forced through carousel (Checks completion on mount and replaces route)', () => {
  assert(landingCode.includes("AsyncStorage.getItem"), 'Must check completion status from AsyncStorage');
  assert(landingCode.includes("navigation.replace('Login')"), 'Must immediately replace route for returning users');
});

console.log('\n─── 3. Authentication Entry Integrity (Tests 10 - 13) ───────────────');

it('10. Google authentication remains available (Google button and signInWithGoogle wired)', () => {
  assert(loginCode.includes('handleGoogleSignIn'), 'Google Sign-In handler must exist');
  assert(loginCode.includes('signInWithGoogle'), 'signInWithGoogle service call must exist');
  assert(loginCode.includes('continueWithGoogle'), 'continueWithGoogle label must be used');
});

it('11. Email authentication remains available (Email and Password inputs with handleLogin)', () => {
  assert(loginCode.includes('keyboardType="email-address"'), 'Email input must exist');
  assert(loginCode.includes('secureTextEntry'), 'Password input must exist');
  assert(loginCode.includes('handleLogin'), 'handleLogin handler must exist');
});

it('12. Phone authentication remains available (Phone modal trigger and PhoneAuthModal mounted)', () => {
  assert(loginCode.includes('continueWithPhone'), 'continueWithPhone key must be used');
  assert(loginCode.includes('<PhoneAuthModal'), 'PhoneAuthModal must be mounted');
  assert(loginCode.includes('setPhoneModalVisible(true)'), 'Phone modal trigger must exist');
});

it('13. role selection is NOT present (Zero role selection dropdown or radio buttons on login)', () => {
  assert(!loginCode.includes('selectRole'), 'Login screen must not ask user to select role');
  assert(!loginCode.includes('RoleSelector'), 'No role selector component in LoginScreen');
  assert(!landingCode.includes('selectRole'), 'No role selector in LandingScreen');
});

console.log('\n─── 4. Authoritative Role Routing Preservation (Tests 14 - 18) ────────');

it('14. role-aware routing remains unchanged (RootNavigator preserves authoritative dispatch)', () => {
  assert(rootNavCode.includes('switch (user.role)'), 'RootNavigator must switch on user.role');
});

it('15. Citizen routing remains intact (CitizenNavigator mounted for CITIZEN)', () => {
  assert(rootNavCode.includes('case ROLES.CITIZEN:'), 'CITIZEN role must be handled');
  assert(rootNavCode.includes('<CitizenNavigator />'), 'CitizenNavigator must be returned');
});

it('16. Collector routing remains intact (CollectorNavigator mounted for INFORMAL_COLLECTOR)', () => {
  assert(rootNavCode.includes('case ROLES.INFORMAL_COLLECTOR:'), 'INFORMAL_COLLECTOR role must be handled');
  assert(rootNavCode.includes('<CollectorNavigator />'), 'CollectorNavigator must be returned');
});

it('17. Recycler routing remains intact (RecyclerNavigator mounted for RECYCLER)', () => {
  assert(rootNavCode.includes('case ROLES.RECYCLER:'), 'RECYCLER role must be handled');
  assert(rootNavCode.includes('<RecyclerNavigator />'), 'RecyclerNavigator must be returned');
});

it('18. Admin routing remains intact (AdminNavigator mounted for ADMIN)', () => {
  assert(rootNavCode.includes('case ROLES.ADMIN:'), 'ADMIN role must be handled');
  assert(rootNavCode.includes('<AdminNavigator />'), 'AdminNavigator must be returned');
});

console.log('\n─── 5. Accessibility, Multilingual & Public-Trust Standards (Tests 19 - 25) ───');

it('19. multilingual key parity remains intact (en, hi, mr, or contain all carousel and trust keys)', () => {
  const enCode = fs.readFileSync(enPath, 'utf8');
  const hiCode = fs.readFileSync(hiPath, 'utf8');
  const mrCode = fs.readFileSync(mrPath, 'utf8');
  const orCode = fs.readFileSync(orPath, 'utf8');

  const requiredKeys = [
    'slide1Title', 'slide1Subtitle',
    'slide2Title', 'slide2Subtitle',
    'slide3Title', 'slide3Subtitle',
    'slide4Title', 'slide4Subtitle',
    'appSubtitle', 'trustStatement', 'secureAuth', 'roleBasedAccess', 'traceableWorkflow',
    'skip', 'next', 'getStarted'
  ];

  for (const key of requiredKeys) {
    assert(enCode.includes(key), `en.ts must include key ${key}`);
    assert(hiCode.includes(key), `hi.ts must include key ${key}`);
    assert(mrCode.includes(key), `mr.ts must include key ${key}`);
    assert(orCode.includes(key), `or.ts must include key ${key}`);
  }
});

it('20. accessibility labels exist (Screen reader tags and accessibilityRoles present)', () => {
  assert(carouselCode.includes('accessibilityRole="button"'), 'Carousel buttons must declare accessibilityRole');
  assert(carouselCode.includes('accessibilityLabel='), 'Carousel must have accessibilityLabel');
  assert(loginCode.includes('accessibilityRole="button"'), 'Login buttons must declare accessibilityRole');
});

it('21. minimum touch targets remain valid (Buttons declare minHeight: 48 for WCAG touch compliance)', () => {
  assert(carouselCode.includes('minHeight: 48'), 'Carousel buttons must specify minHeight: 48');
  assert(loginCode.includes('minHeight: 48'), 'Login buttons and inputs must specify minHeight: 48');
});

it('22. no AI-generated image assets introduced (Zero .png/.jpg/.webp AI graphics imported)', () => {
  assert(!carouselCode.includes('.png') && !carouselCode.includes('.jpg') && !carouselCode.includes('.webp'), 'LoginCarousel must not import image files');
  assert(!loginCode.includes('.png') && !loginCode.includes('.jpg') && !loginCode.includes('.webp'), 'LoginScreen must not import image files');
});

it('23. no fake government branding introduced (Zero fake seals, emblems, or ministry badges)', () => {
  const code = carouselCode + loginCode;
  assert(!code.includes('Government of India certified'), 'Must not claim GoI certified');
  assert(!code.includes('Ministry of Electronics'), 'Must not claim fake ministry affiliation');
  assert(!code.includes('Official Government App'), 'Must not claim Official Government App');
});

it('24. no unsupported government claims introduced (Zero unsupported 100% secure badges)', () => {
  const code = carouselCode + loginCode;
  assert(!code.includes('100% secure'), 'Must not claim 100% secure');
  assert(!code.includes('Government certified'), 'Must not claim Government certified');
  assert(!code.includes('Powered by Government of India'), 'Must not claim Powered by Government of India');
});

it('25. no unnecessary graphics dependency introduced (Zero heavy 3D or lottie animation libraries)', () => {
  assert(!pkgCode.includes('lottie-react-native'), 'Must not add lottie');
  assert(!pkgCode.includes('three'), 'Must not add three.js');
  assert(!pkgCode.includes('@react-three'), 'Must not add react-three');
});

console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  GOVERNMENT LOGIN CAROUSEL RESULTS: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
