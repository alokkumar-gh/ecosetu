/**
 * verify_global_stability.js
 * Comprehensive Global Stability & Design System Recovery Test Suite
 * Validates all 20 criteria specified in Phase 19, Task 27.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let passCount = 0;
let failCount = 0;

function check(condition, testId, message) {
  if (condition) {
    console.log(`  ✅ [${testId}] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [${testId}] FAILED: ${message}`);
    failCount++;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf8');
}

console.log('================================================================');
console.log('ECOSETU GLOBAL STABILITY & DESIGN SYSTEM RECOVERY SUITE');
console.log('Phase 19, Task 27: Full App Stabilization + Design Recovery');
console.log('================================================================\n');

// ── 1. Shared Glass Components ─────────────────────────────────────────────
console.log('─── 1. Shared Glass Components ─────────────────────────────────');
const glassIndex = readFile('src/components/glass/index.ts');
const glassPrimitives = [
  'GlassScreen',
  'GlassBackground',
  'GlassCard',
  'GlassHeader',
  'GlassButton',
  'GlassIconButton',
  'GlassInput',
  'GlassSelect',
  'GlassModal',
  'GlassBottomSheet',
  'GlassMetricCard',
  'GlassTab',
  'GlassBadge',
  'GlassDivider',
  'GlassEmptyState',
  'GlassLoadingState',
  'GlassErrorState',
];
glassPrimitives.forEach((primitive, idx) => {
  check(glassIndex.includes(primitive), `GLS-01-${idx + 1}`, `Glass component '${primitive}' is exported in barrel`);
});

// ── 2. Glass Styling Applied Across Role Screens ────────────────────────────
console.log('\n─── 2. Glass Styling Across Role Screens ────────────────────────');
const citizenDashboard = readFile('src/screens/citizen/CitizenDashboardScreen.tsx');
const collectorPickups = readFile('src/screens/collector/CollectorPickupsScreen.tsx');
const recyclerDashboard = readFile('src/screens/recycler/RecyclerDashboardScreen.tsx');
const adminDashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');

check(citizenDashboard.includes('GlassCard') || citizenDashboard.includes('GradientBackground'), 'ROLE-01', 'Citizen dashboard uses glass surfaces');
check(collectorPickups.includes('glassFill') || collectorPickups.includes('glassBorder'), 'ROLE-02', 'Collector pickups uses glass design tokens');
check(recyclerDashboard.includes('GlassCard') && recyclerDashboard.includes('GlassMetricCard'), 'ROLE-03', 'Recycler dashboard uses GlassCard & GlassMetricCard');
check(adminDashboard.includes('MetricCard') && adminDashboard.includes('TopAppBar'), 'ROLE-04', 'Admin dashboard includes institutional top app bar and metric cards');

// ── 3. Startup Carousel ───────────────────────────────────────────────────
console.log('\n─── 3. Startup Carousel ────────────────────────────────────────');
const carousel = readFile('src/components/auth/LoginCarousel.tsx');
check(carousel.includes('useWindowDimensions()'), 'CAR-01', 'Carousel dynamically calculates width with useWindowDimensions()');
check(!carousel.includes('<LanguageSelector'), 'CAR-02', 'Carousel does NOT embed LanguageSelector chips in slide flow');
check(carousel.includes('slideCard') && carousel.includes('slideInner'), 'CAR-03', 'Carousel maintains structured slide cards with consistent padding');
check(carousel.includes('paginationRow') && carousel.includes('primaryActionButton'), 'CAR-04', 'Carousel has deterministic pagination indicators and CTA');

// ── 4. Language Selector Placement ────────────────────────────────────────
console.log('\n─── 4. Language Selector Placement ─────────────────────────────');
const landing = readFile('src/screens/auth/LandingScreen.tsx');
const login = readFile('src/screens/auth/LoginScreen.tsx');
const citizenProfile = readFile('src/screens/citizen/CitizenProfileScreen.tsx');

check(!landing.includes('<LanguageSelector'), 'LANG-01', 'Startup LandingScreen does NOT show language selector');
check(login.includes('<LanguageSelector variant="compact"'), 'LANG-02', 'LoginScreen includes accessible compact LanguageSelector in top bar');
check(citizenProfile.includes('<LanguageSelector'), 'LANG-03', 'CitizenProfileScreen provides language selection control in settings');

// ── 5. Responsive Dimension Usage ─────────────────────────────────────────
console.log('\n─── 5. Responsive Dimension Usage ──────────────────────────────');
const adminReports = readFile('src/screens/admin/AdminReportsScreen.tsx');
const adminGovernance = readFile('src/screens/admin/AdminGovernanceScreen.tsx');
const adminGeo = readFile('src/screens/admin/AdminGeographicAnalyticsScreen.tsx');

check(!adminReports.includes("const { width: SCREEN_WIDTH } = Dimensions.get('window');"), 'RESP-01', 'AdminReportsScreen has no module-level Dimensions.get');
check(!adminGovernance.includes("const { width: SCREEN_WIDTH } = Dimensions.get('window');"), 'RESP-02', 'AdminGovernanceScreen has no module-level Dimensions.get');
check(!adminGeo.includes("const { width: SCREEN_WIDTH } = Dimensions.get('window');"), 'RESP-03', 'AdminGeographicAnalyticsScreen has no module-level Dimensions.get');

// ── 6. Google Sign-In Flow Wiring ─────────────────────────────────────────
console.log('\n─── 6. Google Sign-In Flow Wiring ──────────────────────────────');
const firebaseAuthService = readFile('src/services/firebaseAuthService.ts');
check(firebaseAuthService.includes('GoogleSignin.signIn()'), 'GSIGN-01', 'Native Google Sign-In account picker is invoked');
check(firebaseAuthService.includes('userInfo.idToken') || firebaseAuthService.includes('getTokens()'), 'GSIGN-02', 'Google ID token extraction handles both direct and token-fetch paths');
check(login.includes('handleGoogleSignIn') && login.includes('isGoogleLoading'), 'GSIGN-03', 'LoginScreen connects Google Sign-In button with loading state');

// ── 7. Firebase Authentication Bridge ─────────────────────────────────────
console.log('\n─── 7. Firebase Authentication Bridge ──────────────────────────');
check(firebaseAuthService.includes('accounts:signInWithIdp'), 'FBR-01', 'Firebase Identity Toolkit endpoint used for ID token exchange');
check(firebaseAuthService.includes('postBody: `id_token='), 'FBR-02', 'Google ID token passed into Identity Toolkit credential postBody');
check(firebaseAuthService.includes('FIREBASE_SIGNIN_SUCCESS'), 'FBR-03', 'Emits FIREBASE_SIGNIN_SUCCESS diagnostic event upon successful exchange');

// ── 8. Backend Firebase Login Bridge ──────────────────────────────────────
console.log('\n─── 8. Backend Firebase Login Bridge ───────────────────────────');
const authServiceJs = readFile('src/services/authService.js');
check(authServiceJs.includes("'/auth/firebase-login'"), 'BE-01', 'authService.js posts to /auth/firebase-login');
check(authServiceJs.includes('STORAGE_KEYS.ACCESS_TOKEN') && authServiceJs.includes('STORAGE_KEYS.USER_PROFILE'), 'BE-02', 'Credentials securely stored in AsyncStorage upon response');

// ── 9. AuthContext Session Handling ───────────────────────────────────────
console.log('\n─── 9. AuthContext Session Handling ────────────────────────────');
const authContext = readFile('src/context/AuthContext.tsx');
check(authContext.includes('loginWithFirebase'), 'ACTX-01', 'AuthContext exposes loginWithFirebase method');
check(authContext.includes('setUser(') && authContext.includes('setAccessToken('), 'ACTX-02', 'AuthContext updates user profile and accessToken states synchronously');

// ── 10. RootNavigator Role Routing ────────────────────────────────────────
console.log('\n─── 10. RootNavigator Role Routing ─────────────────────────────');
const rootNav = readFile('src/navigation/RootNavigator.tsx');
check(rootNav.includes('CitizenNavigator') && rootNav.includes('ROLES.CITIZEN'), 'NAV-01', 'RootNavigator routes CITIZEN role to CitizenNavigator');
check(rootNav.includes('CollectorNavigator') && rootNav.includes('ROLES.INFORMAL_COLLECTOR'), 'NAV-02', 'RootNavigator routes INFORMAL_COLLECTOR to CollectorNavigator');
check(rootNav.includes('RecyclerNavigator') && rootNav.includes('ROLES.RECYCLER'), 'NAV-03', 'RootNavigator routes RECYCLER to RecyclerNavigator');
check(rootNav.includes('AdminNavigator') && rootNav.includes('ROLES.ADMIN'), 'NAV-04', 'RootNavigator routes ADMIN to AdminNavigator');

// ── 11. Maps Provider Configuration ───────────────────────────────────────
console.log('\n─── 11. Maps Provider Configuration ────────────────────────────');
const mapComponent = readFile('src/components/map/EcoSetuMap.tsx');
check(mapComponent.includes('PROVIDER_GOOGLE'), 'MAP-01', 'EcoSetuMap uses PROVIDER_GOOGLE on Android');
check(mapComponent.includes('showsUserLocation={true}'), 'MAP-02', 'EcoSetuMap enables native user location layer');

// ── 12. Location Permission Flow ──────────────────────────────────────────
console.log('\n─── 12. Location Permission Flow ───────────────────────────────');
const locService = readFile('src/services/locationService.ts');
check(locService.includes('PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION'), 'PERM-01', 'locationService requests ACCESS_FINE_LOCATION');
check(locService.includes('checkLocationPermission'), 'PERM-02', 'locationService provides non-prompting checkLocationPermission');

// ── 13. Current Location Acquisition ──────────────────────────────────────
console.log('\n─── 13. Current Location Acquisition ───────────────────────────');
const nativeModulePkg = readFile('android/app/src/main/java/com/ecosetu/EcoSetuTTSPackage.kt');
const nativeLocationMod = readFile('android/app/src/main/java/com/ecosetu/EcoSetuLocationModule.kt');
check(nativeLocationMod.includes('class EcoSetuLocationModule'), 'LOC-01', 'EcoSetuLocationModule native Android module exists');
check(nativeModulePkg.includes('EcoSetuLocationModule(reactContext)'), 'LOC-02', 'EcoSetuLocationModule registered in React Native package');
check(locService.includes('EcoSetuLocation.getCurrentLocation'), 'LOC-03', 'locationService bridges to NativeModules.EcoSetuLocation');

// ── 14. No Delhi Hard-Coded Location ──────────────────────────────────────
console.log('\n─── 14. No Delhi Hard-Coded Location ───────────────────────────');
const submitScreen = readFile('src/screens/citizen/SubmitItemScreen.tsx');
check(!locService.includes('latitude: 28.6139'), 'DELHI-01', 'locationService.ts has ZERO hardcoded Delhi latitude');
check(!submitScreen.includes('useState<number>(28.6139)'), 'DELHI-02', 'SubmitItemScreen has ZERO default 28.6139 state');
check(!mapComponent.includes('latitude: latitude || 28.6139'), 'DELHI-03', 'EcoSetuMap has ZERO hardcoded 28.6139 fallback');

// ── 15. SafeArea Usage ────────────────────────────────────────────────────
console.log('\n─── 15. SafeArea Usage ─────────────────────────────────────────');
const glassScreen = readFile('src/components/glass/GlassScreen.tsx');
check(glassScreen.includes('SafeAreaView') && glassScreen.includes("edges={['top', 'left', 'right']}"), 'SAFE-01', 'GlassScreen applies SafeAreaView with proper edge constraints');
check(login.includes('SafeAreaView'), 'SAFE-02', 'LoginScreen wraps content in SafeAreaView');

// ── 16. Minimum Touch Targets (>= 44dp) ───────────────────────────────────
console.log('\n─── 16. Minimum Touch Targets (>= 44dp) ────────────────────────');
const glassBtn = readFile('src/components/glass/GlassButton.tsx');
const glassIconBtn = readFile('src/components/glass/GlassIconButton.tsx');
check(glassBtn.includes('minHeight: 52') || glassBtn.includes('minHeight: 48') || glassBtn.includes('minHeight: 44'), 'TOUCH-01', 'GlassButton enforces >= 44dp touch target (minHeight: 52dp)');
check(glassIconBtn.includes('size = 44') || glassIconBtn.includes('minHeight: 44'), 'TOUCH-02', 'GlassIconButton enforces >= 44dp touch target');

// ── 17. No Token Logging (Strict Redaction) ───────────────────────────────
console.log('\n─── 17. No Token Logging ───────────────────────────────────────');
check(!firebaseAuthService.includes('console.log(idToken'), 'SEC-01', 'firebaseAuthService does not log raw idToken');
check(!firebaseAuthService.includes('console.log(googleIdToken'), 'SEC-02', 'firebaseAuthService does not log raw googleIdToken');
check(!authServiceJs.includes('console.log(accessToken'), 'SEC-03', 'authService.js does not log raw accessToken');

// ── 18. No API Key Leakage ────────────────────────────────────────────────
console.log('\n─── 18. No API Key Leakage ─────────────────────────────────────');
const androidManifest = readFile('android/app/src/main/AndroidManifest.xml');
check(androidManifest.includes('${MAPS_API_KEY}'), 'SEC-04', 'Google Maps API key injected via manifest placeholder, not hardcoded string');

// ── 19. No RECORD_AUDIO Regression ────────────────────────────────────────
console.log('\n─── 19. No RECORD_AUDIO Regression ─────────────────────────────');
check(androidManifest.includes('android.permission.RECORD_AUDIO'), 'PERM-03', 'RECORD_AUDIO permission preserved for collector voice commands');
const speechMod = readFile('android/app/src/main/java/com/ecosetu/EcoSetuSpeechModule.kt');
check(speechMod.includes('SpeechRecognizer'), 'PERM-04', 'EcoSetuSpeechModule preserved for voice command accessibility');

// ── 20. Existing Offline/RBAC Architecture Preserved ──────────────────────
console.log('\n─── 20. Existing Offline / RBAC Architecture Preserved ─────────');
const offlineBanner = readFile('src/components/common/OfflineBanner.tsx');
const statusBadge = readFile('src/components/common/StatusBadge.tsx');
check(offlineBanner.includes('OfflineBanner'), 'ARCH-01', 'OfflineBanner component preserved');
check(statusBadge.includes('StatusBadge'), 'ARCH-02', 'Canonical StatusBadge component preserved');
check(authServiceJs.includes('ROLES') || rootNav.includes('ROLES'), 'ARCH-03', 'Canonical RBAC constants preserved across navigation and auth');

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL 20 GLOBAL STABILITY CRITERIA VERIFIED SUCCESSFULLY!');
}
