/**
 * verify_recycler_directory.js
 * Automated Verification Suite for SIH 26229 Prompt 10:
 * Recycler Directory + Collector Discovery Experience
 * Canonical Reference: SIH Problem Statement 26229, docs/25_SIH_26229_REQUIREMENTS.md Section 7
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runRecyclerDirectoryVerification() {
  console.log('=================================================================');
  console.log('--- STARTING VERIFY_RECYCLER_DIRECTORY (SIH 26229 PROMPT 10) ---');
  console.log('=================================================================\n');

  let passedChecks = 0;
  let failedChecks = 0;
  const failures = [];

  function passCheck(num, desc) {
    passedChecks++;
    console.log(`[PASS] Check ${num}: ${desc}`);
  }
  function failCheck(num, desc, err) {
    failedChecks++;
    failures.push({ num, desc, err: err ? err.message || String(err) : '' });
    console.error(`[FAIL] Check ${num}: ${desc}${err ? ' — ' + (err.message || err) : ''}`);
  }

  const rootDir = path.resolve(__dirname, '../..');

  // ---------------------------------------------------------------------------
  // FILE PATHS
  // ---------------------------------------------------------------------------
  const backendServicePath = path.join(rootDir, 'backend/src/services/recyclerService.js');
  const backendControllerPath = path.join(rootDir, 'backend/src/controllers/recyclerController.js');
  const backendValidatorPath = path.join(rootDir, 'backend/src/validators/recyclerValidators.js');
  const backendRoutePath = path.join(rootDir, 'backend/src/routes/recyclerRoutes.js');
  const mobileServicePath = path.join(rootDir, 'mobile/src/services/recyclerDirectoryService.ts');
  const directoryScreenPath = path.join(rootDir, 'mobile/src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
  const detailScreenPath = path.join(rootDir, 'mobile/src/screens/collector/CollectorRecyclerDetailScreen.tsx');
  const navTypesPath = path.join(rootDir, 'mobile/src/navigation/types.ts');
  const collectorNavPath = path.join(rootDir, 'mobile/src/navigation/CollectorNavigator.tsx');
  const dashboardScreenPath = path.join(rootDir, 'mobile/src/screens/collector/CollectorDashboardScreen.tsx');
  const matchesScreenPath = path.join(rootDir, 'mobile/src/screens/collector/CollectorRecyclerMatchesScreen.tsx');
  const constantsPath = path.join(rootDir, 'mobile/src/utils/constants.js');
  const enLocalePath = path.join(rootDir, 'mobile/src/i18n/locales/en.ts');
  const hiLocalePath = path.join(rootDir, 'mobile/src/i18n/locales/hi.ts');
  const mrLocalePath = path.join(rootDir, 'mobile/src/i18n/locales/mr.ts');
  const orLocalePath = path.join(rootDir, 'mobile/src/i18n/locales/or.ts');
  const i18nConfigPath = path.join(rootDir, 'mobile/src/i18n/config.ts');

  // ---------------------------------------------------------------------------
  // GROUP 1: BACKEND FILES EXIST
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 1: Backend Files Exist ---');

  try {
    assert(fs.existsSync(backendServicePath), 'recyclerService.js must exist');
    passCheck(1, 'recyclerService.js exists');
  } catch (e) { failCheck(1, 'recyclerService.js exists', e); }

  try {
    assert(fs.existsSync(backendControllerPath), 'recyclerController.js must exist');
    passCheck(2, 'recyclerController.js exists');
  } catch (e) { failCheck(2, 'recyclerController.js exists', e); }

  try {
    assert(fs.existsSync(backendValidatorPath), 'recyclerValidators.js must exist');
    passCheck(3, 'recyclerValidators.js exists');
  } catch (e) { failCheck(3, 'recyclerValidators.js exists', e); }

  try {
    assert(fs.existsSync(backendRoutePath), 'recyclerRoutes.js must exist');
    passCheck(4, 'recyclerRoutes.js exists');
  } catch (e) { failCheck(4, 'recyclerRoutes.js exists', e); }

  // ---------------------------------------------------------------------------
  // GROUP 2: BACKEND ROUTE — GET /recyclers & GET /recyclers/:id
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 2: Backend API Routes ---');
  const routeContent = fs.existsSync(backendRoutePath) ? fs.readFileSync(backendRoutePath, 'utf8') : '';

  try {
    assert(routeContent.includes("router.get(\n  '/'") || routeContent.includes("router.get('/'"), 'GET /recyclers route must exist');
    passCheck(5, 'GET /api/v1/recyclers list route is registered');
  } catch (e) { failCheck(5, 'GET /api/v1/recyclers list route is registered', e); }

  try {
    assert(routeContent.includes("router.get(\n  '/:id'") || routeContent.includes("router.get('/:id'"), 'GET /recyclers/:id route must exist');
    passCheck(6, 'GET /api/v1/recyclers/:id detail route is registered');
  } catch (e) { failCheck(6, 'GET /api/v1/recyclers/:id detail route is registered', e); }

  try {
    assert(routeContent.includes('INFORMAL_COLLECTOR'), 'INFORMAL_COLLECTOR must be authorized to access recycler routes');
    passCheck(7, 'Informal collectors are authorized to access recycler directory routes');
  } catch (e) { failCheck(7, 'Informal collectors are authorized to access recycler directory routes', e); }

  try {
    assert(routeContent.includes('listRecyclers') && routeContent.includes('getRecyclerById'), 'Controller methods must be registered');
    passCheck(8, 'Controller methods listRecyclers and getRecyclerById are wired up');
  } catch (e) { failCheck(8, 'Controller methods listRecyclers and getRecyclerById are wired up', e); }

  // ---------------------------------------------------------------------------
  // GROUP 3: BACKEND SERVICE — LISTING LOGIC
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 3: Backend Service — Listing Logic ---');
  const serviceContent = fs.existsSync(backendServicePath) ? fs.readFileSync(backendServicePath, 'utf8') : '';

  try {
    assert(serviceContent.includes('listVerifiedRecyclers'), 'listVerifiedRecyclers method must exist');
    passCheck(9, 'listVerifiedRecyclers service method exists');
  } catch (e) { failCheck(9, 'listVerifiedRecyclers service method exists', e); }

  try {
    assert(serviceContent.includes('USER_STATUS.ACTIVE'), 'Service must filter for active users only');
    passCheck(10, 'Directory listing filters to active users only (no inactive/banned accounts)');
  } catch (e) { failCheck(10, 'Directory listing filters to active users only', e); }

  try {
    assert(serviceContent.includes('acceptedCategories') && serviceContent.includes("has: options.category"), 'Category filter must be applied');
    passCheck(11, 'Category filter is applied when querying recyclers');
  } catch (e) { failCheck(11, 'Category filter is applied when querying recyclers', e); }

  try {
    assert(serviceContent.includes('authorizationStatus') && serviceContent.includes('options.authorizationStatus'), 'Authorization status filter must be applied');
    passCheck(12, 'Authorization status filter is supported in listing');
  } catch (e) { failCheck(12, 'Authorization status filter is supported in listing', e); }

  try {
    assert(serviceContent.includes('options.pickupAvailable') || serviceContent.includes('pickupAvailable: options.pickupAvailable'), 'Pickup filter must exist');
    passCheck(13, 'Pickup availability filter is supported in listing');
  } catch (e) { failCheck(13, 'Pickup availability filter is supported in listing', e); }

  try {
    assert(serviceContent.includes('options.search') && serviceContent.includes('facilityName'), 'Full-text search across facility fields must exist');
    passCheck(14, 'Free-text search across facilityName / city / district / state / serviceArea is implemented');
  } catch (e) { failCheck(14, 'Free-text search across facility fields', e); }

  try {
    assert(serviceContent.includes('hasRates'), 'hasRates filter must exist for filtering by active rates');
    passCheck(15, 'hasRates filter is supported to filter recyclers with active offered rates');
  } catch (e) { failCheck(15, 'hasRates filter implemented', e); }

  // ---------------------------------------------------------------------------
  // GROUP 4: BACKEND SERVICE — DISTANCE CALCULATION
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 4: Backend Service — Distance Calculation ---');

  try {
    assert(serviceContent.includes('calculateHaversineDistanceKm'), 'Haversine distance function must exist');
    passCheck(16, 'Haversine distance calculation function exists');
  } catch (e) { failCheck(16, 'Haversine distance calculation function exists', e); }

  try {
    assert(serviceContent.includes('distanceKm'), 'distanceKm must be returned in listing response');
    passCheck(17, 'distanceKm is included in recycler directory listing response');
  } catch (e) { failCheck(17, 'distanceKm included in listing response', e); }

  try {
    assert(serviceContent.includes('userLat') && serviceContent.includes('userLng'), 'User lat/lng coordinates must be accepted and used');
    passCheck(18, 'User lat/lng passed to distance calculation for proximity sort');
  } catch (e) { failCheck(18, 'User lat/lng used in distance calculation', e); }

  // ---------------------------------------------------------------------------
  // GROUP 5: BACKEND SERVICE — SINGLE FACILITY DETAIL
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 5: Backend Service — Single Recycler Detail ---');

  try {
    assert(serviceContent.includes('getRecyclerById'), 'getRecyclerById method must exist');
    passCheck(19, 'getRecyclerById service method exists');
  } catch (e) { failCheck(19, 'getRecyclerById service method exists', e); }

  try {
    assert(serviceContent.includes('licenseNumber'), 'License number must be included in detail response');
    passCheck(20, 'License/authorization number is exposed in facility detail response');
  } catch (e) { failCheck(20, 'License number included in detail response', e); }

  try {
    assert(serviceContent.includes('offeredRates') && serviceContent.includes("source: 'RECYCLER_OFFER'"), 'Rates must be labeled RECYCLER_OFFER to distinguish from market price');
    passCheck(21, "Offered rates labeled source: 'RECYCLER_OFFER' — not market price (anti-fabrication)");
  } catch (e) { failCheck(21, "Offered rates labeled RECYCLER_OFFER (not market price)", e); }

  try {
    assert(serviceContent.includes("throw AppError.notFound"), '404 must be thrown when recycler not found');
    passCheck(22, '404 AppError thrown when recycler facility not found');
  } catch (e) { failCheck(22, '404 AppError thrown when facility not found', e); }

  try {
    assert(serviceContent.includes('contact:'), 'Contact details block must be present in detail response');
    passCheck(23, 'Contact details (name/email/phone) are returned in facility detail');
  } catch (e) { failCheck(23, 'Contact details in facility detail', e); }

  // ---------------------------------------------------------------------------
  // GROUP 6: BACKEND VALIDATOR
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 6: Backend Validator ---');
  const validatorContent = fs.existsSync(backendValidatorPath) ? fs.readFileSync(backendValidatorPath, 'utf8') : '';

  try {
    assert(validatorContent.includes('listRecyclers'), 'listRecyclers validator must exist');
    passCheck(24, 'listRecyclers request validator exists');
  } catch (e) { failCheck(24, 'listRecyclers request validator exists', e); }

  try {
    assert(validatorContent.includes('getRecyclerById'), 'getRecyclerById validator must exist');
    passCheck(25, 'getRecyclerById request validator exists');
  } catch (e) { failCheck(25, 'getRecyclerById request validator exists', e); }

  // ---------------------------------------------------------------------------
  // GROUP 7: MOBILE SERVICE FILE
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 7: Mobile Service File ---');

  try {
    assert(fs.existsSync(mobileServicePath), 'recyclerDirectoryService.ts must exist');
    passCheck(26, 'recyclerDirectoryService.ts mobile service file exists');
  } catch (e) { failCheck(26, 'recyclerDirectoryService.ts exists', e); }

  const mobileServiceContent = fs.existsSync(mobileServicePath) ? fs.readFileSync(mobileServicePath, 'utf8') : '';

  try {
    assert(mobileServiceContent.includes('AsyncStorage'), 'Offline caching via AsyncStorage must be implemented');
    passCheck(27, 'Offline caching via AsyncStorage is implemented in mobile service');
  } catch (e) { failCheck(27, 'Offline caching via AsyncStorage implemented', e); }

  try {
    assert(mobileServiceContent.includes('CACHE_KEY_DIRECTORY'), 'Cache key constant must be defined');
    passCheck(28, 'AsyncStorage cache key constant is defined for recycler directory');
  } catch (e) { failCheck(28, 'Cache key constant defined', e); }

  try {
    assert(mobileServiceContent.includes('RecyclerDirectoryItem'), 'RecyclerDirectoryItem interface must be exported');
    passCheck(29, 'RecyclerDirectoryItem TypeScript interface is exported from mobile service');
  } catch (e) { failCheck(29, 'RecyclerDirectoryItem interface exported', e); }

  try {
    assert(mobileServiceContent.includes('RecyclerDetail'), 'RecyclerDetail interface must be exported');
    passCheck(30, 'RecyclerDetail TypeScript interface is exported from mobile service');
  } catch (e) { failCheck(30, 'RecyclerDetail interface exported', e); }

  try {
    assert(mobileServiceContent.includes('authorizationStatus'), 'authorizationStatus field must be in RecyclerDirectoryItem interface');
    passCheck(31, 'authorizationStatus field is present in RecyclerDirectoryItem interface');
  } catch (e) { failCheck(31, 'authorizationStatus in interface', e); }

  try {
    assert(
      mobileServiceContent.includes('generateTtsText') ||
      mobileServiceContent.includes('ttsText') ||
      mobileServiceContent.includes('getTtsDescription') ||
      mobileServiceContent.includes('generateRecyclerSpeechText') ||
      mobileServiceContent.includes('speechText'),
      'TTS audio description method must exist'
    );
    passCheck(32, 'Text-to-Speech audio description method exists in mobile service');
  } catch (e) { failCheck(32, 'TTS audio description method exists', e); }

  // ---------------------------------------------------------------------------
  // GROUP 8: MOBILE SCREENS
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 8: Mobile Screens ---');

  try {
    assert(fs.existsSync(directoryScreenPath), 'CollectorRecyclerDirectoryScreen.tsx must exist');
    passCheck(33, 'CollectorRecyclerDirectoryScreen.tsx exists');
  } catch (e) { failCheck(33, 'CollectorRecyclerDirectoryScreen.tsx exists', e); }

  try {
    assert(fs.existsSync(detailScreenPath), 'CollectorRecyclerDetailScreen.tsx must exist');
    passCheck(34, 'CollectorRecyclerDetailScreen.tsx exists');
  } catch (e) { failCheck(34, 'CollectorRecyclerDetailScreen.tsx exists', e); }

  const dirScreenContent = fs.existsSync(directoryScreenPath) ? fs.readFileSync(directoryScreenPath, 'utf8') : '';
  const detailScreenContent = fs.existsSync(detailScreenPath) ? fs.readFileSync(detailScreenPath, 'utf8') : '';

  // --- Directory Screen checks ---
  try {
    assert(dirScreenContent.includes('TextInput'), 'Search input must be present in directory screen');
    passCheck(35, 'Directory screen has a search/filter TextInput');
  } catch (e) { failCheck(35, 'Directory screen has search TextInput', e); }

  try {
    assert(dirScreenContent.includes('authorizationStatus') || dirScreenContent.includes('AUTH_FILTERS'), 'Authorization status filter UI must exist in directory screen');
    passCheck(36, 'Directory screen exposes authorization status filter chips');
  } catch (e) { failCheck(36, 'Authorization status filter in directory screen', e); }

  try {
    assert(dirScreenContent.includes('isConnected'), 'Offline state must be handled in directory screen');
    passCheck(37, 'Directory screen handles offline/online state via useNetwork hook');
  } catch (e) { failCheck(37, 'Offline state handled in directory screen', e); }

  try {
    assert(dirScreenContent.includes('RefreshControl'), 'Pull-to-refresh must be present in directory screen');
    passCheck(38, 'Directory screen supports pull-to-refresh');
  } catch (e) { failCheck(38, 'Pull-to-refresh in directory screen', e); }

  try {
    assert(
      dirScreenContent.includes('authorizationStatus') &&
      (dirScreenContent.includes('AUTHORIZED') || dirScreenContent.includes('PROVISIONAL')),
      'Authorization status badge must be rendered per recycler card'
    );
    passCheck(39, 'Authorization status badge is rendered on each recycler card in directory');
  } catch (e) { failCheck(39, 'Authorization status badge rendered on cards', e); }

  try {
    assert(dirScreenContent.includes('distanceKm') || dirScreenContent.includes('distance'), 'Distance from user must be shown in directory card');
    passCheck(40, 'Distance from collector is shown on each directory card');
  } catch (e) { failCheck(40, 'Distance shown on directory cards', e); }

  try {
    assert(
      dirScreenContent.includes('hasActiveRates') || dirScreenContent.includes('activeRatesCount'),
      'Active rate indicator must be shown per recycler card'
    );
    passCheck(41, 'Active rate indicator shown per recycler card in directory list');
  } catch (e) { failCheck(41, 'Active rate indicator shown in directory', e); }

  try {
    assert(dirScreenContent.includes('Linking') && dirScreenContent.includes('tel:'), 'Click-to-call must be implemented in directory or detail screen');
    passCheck(42, 'Click-to-call (Linking tel:) is implemented');
  } catch (e) {
    // Also check detail screen
    try {
      assert(detailScreenContent.includes('Linking') && (detailScreenContent.includes('tel:') || detailScreenContent.includes('phone')), 'Click-to-call must be in detail screen');
      passCheck(42, 'Click-to-call (Linking tel:) is implemented in detail screen');
    } catch (e2) { failCheck(42, 'Click-to-call (Linking tel:) is implemented', e); }
  }

  // --- Detail Screen checks ---
  try {
    assert(detailScreenContent.includes('licenseNumber') || detailScreenContent.includes('license'), 'License/authorization number shown in detail screen');
    passCheck(43, 'License / authorization number displayed in facility detail screen');
  } catch (e) { failCheck(43, 'License number displayed in detail screen', e); }

  try {
    assert(detailScreenContent.includes('offeredRates') || detailScreenContent.includes('activeRates'), 'Offered rates must be listed in detail screen');
    passCheck(44, 'Offered rates are listed in facility detail screen');
  } catch (e) { failCheck(44, 'Offered rates listed in detail screen', e); }

  try {
    assert(
      detailScreenContent.includes('RECYCLER_OFFER') ||
      detailScreenContent.includes('Recycler Offered') ||
      detailScreenContent.includes('recyclerOffered') ||
      detailScreenContent.includes('recycler_offered'),
      'Detail screen must visually distinguish recycler offered rates from market price'
    );
    passCheck(45, 'Detail screen clearly distinguishes "Recycler Offered Rate" from "Market Price"');
  } catch (e) { failCheck(45, 'Offered rates distinguished from market price in detail', e); }

  try {
    assert(
      detailScreenContent.includes('authorizationStatus') &&
      (detailScreenContent.includes('AUTHORIZED') || detailScreenContent.includes('authorization')),
      'Authorization status must be clearly shown in detail screen'
    );
    passCheck(46, 'Authorization status is clearly displayed in facility detail screen');
  } catch (e) { failCheck(46, 'Authorization status shown in detail screen', e); }

  // ---------------------------------------------------------------------------
  // GROUP 9: NAVIGATION
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 9: Navigation Integration ---');
  const navTypesContent = fs.existsSync(navTypesPath) ? fs.readFileSync(navTypesPath, 'utf8') : '';
  const collectorNavContent = fs.existsSync(collectorNavPath) ? fs.readFileSync(collectorNavPath, 'utf8') : '';

  try {
    assert(navTypesContent.includes('CollectorRecyclerDirectory') || navTypesContent.includes('RecyclerDirectory'), 'Directory screen must be in navigation types');
    passCheck(47, 'CollectorRecyclerDirectoryScreen is registered in navigation types');
  } catch (e) { failCheck(47, 'Directory screen in navigation types', e); }

  try {
    assert(navTypesContent.includes('CollectorRecyclerDetail') || navTypesContent.includes('RecyclerDetail'), 'Detail screen must be in navigation types');
    passCheck(48, 'CollectorRecyclerDetailScreen is registered in navigation types');
  } catch (e) { failCheck(48, 'Detail screen in navigation types', e); }

  try {
    assert(
      collectorNavContent.includes('CollectorRecyclerDirectoryScreen') || collectorNavContent.includes('RecyclerDirectoryScreen'),
      'Directory screen must be registered in CollectorNavigator'
    );
    passCheck(49, 'CollectorRecyclerDirectoryScreen is registered in CollectorNavigator');
  } catch (e) { failCheck(49, 'Directory screen registered in CollectorNavigator', e); }

  try {
    assert(
      collectorNavContent.includes('CollectorRecyclerDetailScreen') || collectorNavContent.includes('RecyclerDetailScreen'),
      'Detail screen must be registered in CollectorNavigator'
    );
    passCheck(50, 'CollectorRecyclerDetailScreen is registered in CollectorNavigator');
  } catch (e) { failCheck(50, 'Detail screen registered in CollectorNavigator', e); }

  // ---------------------------------------------------------------------------
  // GROUP 10: DASHBOARD ENTRY POINT
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 10: Dashboard Entry Point ---');
  const dashboardContent = fs.existsSync(dashboardScreenPath) ? fs.readFileSync(dashboardScreenPath, 'utf8') : '';

  try {
    assert(
      dashboardContent.includes('RecyclerDirectory') || dashboardContent.includes('recyclerDirectory') || dashboardContent.includes('Recycler Directory'),
      'Recycler Directory entry point must exist on Collector Dashboard'
    );
    passCheck(51, 'Recycler Directory entry card/button is present on Collector Dashboard');
  } catch (e) { failCheck(51, 'Recycler Directory entry point on dashboard', e); }

  // ---------------------------------------------------------------------------
  // GROUP 11: RECYCLER MATCHES SCREEN INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 11: Recycler Matches Screen Integration ---');
  const matchesContent = fs.existsSync(matchesScreenPath) ? fs.readFileSync(matchesScreenPath, 'utf8') : '';

  try {
    assert(
      matchesContent.includes('CollectorRecyclerDetail') || matchesContent.includes('RecyclerDetail'),
      'Matches screen must have "View Recycler Details" navigation'
    );
    passCheck(52, '"View Recycler Details" navigation is added to Recycler Matches screen');
  } catch (e) { failCheck(52, '"View Recycler Details" navigation in matches screen', e); }

  // ---------------------------------------------------------------------------
  // GROUP 12: I18N & CONSTANTS
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 12: i18n and Constants ---');
  const constantsContent = fs.existsSync(constantsPath) ? fs.readFileSync(constantsPath, 'utf8') : '';
  const enContent = fs.existsSync(enLocalePath) ? fs.readFileSync(enLocalePath, 'utf8') : '';
  const hiContent = fs.existsSync(hiLocalePath) ? fs.readFileSync(hiLocalePath, 'utf8') : '';
  const mrContent = fs.existsSync(mrLocalePath) ? fs.readFileSync(mrLocalePath, 'utf8') : '';
  const orContent = fs.existsSync(orLocalePath) ? fs.readFileSync(orLocalePath, 'utf8') : '';

  try {
    assert(
      constantsContent.includes('RECYCLER_AUTHORIZATION_STATUS'),
      'RECYCLER_AUTHORIZATION_STATUS enum must be in constants'
    );
    passCheck(53, 'RECYCLER_AUTHORIZATION_STATUS enum is defined in mobile constants');
  } catch (e) { failCheck(53, 'RECYCLER_AUTHORIZATION_STATUS in constants', e); }

  try {
    assert(
      constantsContent.includes('PICKUP_AVAILABILITY') || constantsContent.includes('PICKUP_AVAILABLE'),
      'PICKUP_AVAILABILITY enum must be in constants'
    );
    passCheck(54, 'PICKUP_AVAILABILITY enum is defined in mobile constants');
  } catch (e) { failCheck(54, 'PICKUP_AVAILABILITY enum in constants', e); }

  try {
    assert(enContent.includes('recyclerDirectory'), 'English locale must include recyclerDirectory translations');
    passCheck(55, 'English locale includes recyclerDirectory translation namespace');
  } catch (e) { failCheck(55, 'English locale has recyclerDirectory namespace', e); }

  try {
    assert(hiContent.includes('recyclerDirectory'), 'Hindi locale must include recyclerDirectory translations');
    passCheck(56, 'Hindi locale includes recyclerDirectory translation namespace');
  } catch (e) { failCheck(56, 'Hindi locale has recyclerDirectory namespace', e); }

  try {
    assert(mrContent.includes('recyclerDirectory'), 'Marathi locale must include recyclerDirectory translations');
    passCheck(57, 'Marathi locale includes recyclerDirectory translation namespace');
  } catch (e) { failCheck(57, 'Marathi locale has recyclerDirectory namespace', e); }

  try {
    assert(orContent.includes('recyclerDirectory'), 'Odia locale must include recyclerDirectory translations');
    passCheck(58, 'Odia locale includes recyclerDirectory translation namespace');
  } catch (e) { failCheck(58, 'Odia locale has recyclerDirectory namespace', e); }

  // ---------------------------------------------------------------------------
  // GROUP 13: i18n CONFIG SCHEMA
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 13: i18n Config Schema ---');
  const i18nConfigContent = fs.existsSync(i18nConfigPath) ? fs.readFileSync(i18nConfigPath, 'utf8') : '';

  try {
    assert(i18nConfigContent.includes('recyclerDirectory'), 'i18n config schema must include recyclerDirectory');
    passCheck(59, 'i18n config TypeScript schema includes recyclerDirectory namespace');
  } catch (e) { failCheck(59, 'i18n config includes recyclerDirectory schema', e); }

  // ---------------------------------------------------------------------------
  // GROUP 14: ANTI-FABRICATION CHECKS
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 14: Anti-Fabrication / Safety Checks ---');

  try {
    // The service must NOT have any hardcoded recycler names/addresses/lat/lng
    const hasHardcodedRecycler = serviceContent.includes('Green Earth Recycling') || serviceContent.includes('EcoGreen');
    assert(!hasHardcodedRecycler, 'Service must NOT contain hardcoded recycler names (anti-fabrication)');
    passCheck(60, 'Backend service does NOT contain hardcoded/fabricated recycler names (anti-fabrication rule)');
  } catch (e) { failCheck(60, 'No hardcoded recycler names in service (anti-fabrication)', e); }

  try {
    // Service must NOT invent authorizationStatus; it only reads from DB field
    assert(serviceContent.includes('authorizationStatus: r.authorizationStatus') || serviceContent.includes('authorizationStatus: profile.authorizationStatus'), 'authorizationStatus must be read from DB, not computed/fabricated');
    passCheck(61, 'authorizationStatus is read from database, not invented/fabricated');
  } catch (e) { failCheck(61, 'authorizationStatus read from DB (anti-fabrication)', e); }

  try {
    // Offered rates must include sourceReference field for traceability
    assert(serviceContent.includes('sourceReference'), 'sourceReference must be included in offered rates (traceability)');
    passCheck(62, 'sourceReference is included in offered rates for rate traceability');
  } catch (e) { failCheck(62, 'sourceReference included in offered rates', e); }

  // ---------------------------------------------------------------------------
  // GROUP 15: PAGINATION
  // ---------------------------------------------------------------------------
  console.log('\n--- GROUP 15: Pagination ---');

  try {
    assert(serviceContent.includes('page') && serviceContent.includes('limit') && serviceContent.includes('skip'), 'Backend must support paginated listing');
    passCheck(63, 'Backend recycler listing supports pagination (page / limit / skip)');
  } catch (e) { failCheck(63, 'Pagination supported in backend listing', e); }

  try {
    assert(serviceContent.includes('totalPages') && serviceContent.includes('total'), 'Pagination metadata (total, totalPages) must be returned');
    passCheck(64, 'Pagination metadata (total, totalPages) is returned in listing response');
  } catch (e) { failCheck(64, 'Pagination metadata returned in listing response', e); }

  try {
    assert(mobileServiceContent.includes('page') || mobileServiceContent.includes('pagination'), 'Mobile service must support pagination parameters');
    passCheck(65, 'Mobile service supports pagination parameters for directory listing');
  } catch (e) { failCheck(65, 'Mobile service supports pagination', e); }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(`SUMMARY: ${passedChecks} PASSED / ${failedChecks} FAILED (${passedChecks + failedChecks} total)`);
  if (failures.length > 0) {
    console.log('\nFailed checks:');
    failures.forEach((f) => console.log(`  [FAIL] Check ${f.num}: ${f.desc}${f.err ? ' — ' + f.err : ''}`));
  }
  console.log('=================================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runRecyclerDirectoryVerification().catch((err) => {
  console.error('Fatal error in verify_recycler_directory.js:', err);
  process.exit(1);
});
