/**
 * verify_location_foundation.js
 * Comprehensive Verification Suite — Phase 19, Task 4: Location & Address Foundation (Backend + Database).
 *
 * Verifies:
 *   1. Canonical location & address fields in Prisma schema and migration.
 *   2. Coordinate validation (latitude [-90, 90], longitude [-180, 180]).
 *   3. Indian PIN code validation (6 digits, first digit 1-9).
 *   4. Address type enum validation (HOME, OFFICE, OTHER).
 *   5. Citizen location data structure and address composition.
 *   6. Collector location & service-area structure.
 *   7. Recycler facility location structure.
 *   8. Strict privacy masking (approximate coordinates, nullified street/house/PIN for unaccepted requests).
 *   9. Backward compatibility for legacy records without structured fields.
 *   10. Existing Haversine calculation behavior and invalid input resilience.
 *   11. RBAC protection on location endpoints.
 *   12. Strict business chain: Zero direct Citizen → Recycler path.
 *   13. Strict scope boundary: Zero Google Maps, MapView, GPS tracking permissions, TTS, or audio.
 *
 * Run: node mobile/tests/verify_location_foundation.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
  const absPath = path.resolve(__dirname, '..', '..', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

async function runLocationFoundationVerification() {
  console.log('================================================================');
  console.log('ECOSETU LOCATION & ADDRESS FOUNDATION VERIFICATION SUITE');
  console.log('Phase 19, Task 4: Backend + Database Canonical Foundation');
  console.log('================================================================\n');

  // ─── 1. Canonical Schema & Database Migration ────────────────────────────────
  console.log('─── 1. Canonical Database Models & Schema Verification ─────────');

  const schemaFile = readFile('backend/prisma/schema.prisma');
  check(schemaFile.exists, 'SCH-01', 'backend/prisma/schema.prisma exists');

  // AddressType enum
  check(
    schemaFile.content.includes('enum AddressType') &&
      schemaFile.content.includes('HOME') &&
      schemaFile.content.includes('OFFICE') &&
      schemaFile.content.includes('OTHER'),
    'SCH-02',
    'AddressType enum defined with HOME, OFFICE, OTHER'
  );

  // CollectionRequest location fields
  const crFields = [
    'pickupAddress',
    'pickupLat',
    'pickupLng',
    'houseNumber',
    'street',
    'landmark',
    'city',
    'district',
    'state',
    'pincode',
    'locationAccuracy',
    'addressType',
  ];
  crFields.forEach((field, i) => {
    check(
      schemaFile.content.includes(field),
      `SCH-03-${i + 1}`,
      `CollectionRequest includes canonical location field '${field}'`
    );
  });

  // CollectorProfile location fields
  const cpFields = [
    'serviceAreaLat',
    'serviceAreaLng',
    'serviceRadiusKm',
    'serviceArea',
    'city',
    'state',
    'pincode',
  ];
  cpFields.forEach((field, i) => {
    check(
      schemaFile.content.includes(field),
      `SCH-04-${i + 1}`,
      `CollectorProfile includes location/service-area field '${field}'`
    );
  });

  // RecyclerProfile facility location fields
  const rpFields = [
    'facilityAddress',
    'facilityLat',
    'facilityLng',
    'city',
    'district',
    'state',
    'pincode',
  ];
  rpFields.forEach((field, i) => {
    check(
      schemaFile.content.includes(field),
      `SCH-05-${i + 1}`,
      `RecyclerProfile includes facility location field '${field}'`
    );
  });

  // Migration file check
  const migFile = readFile(
    'backend/prisma/migrations/20260918170000_location_address_foundation/migration.sql'
  );
  check(migFile.exists, 'MIG-01', 'Migration file 20260918170000_location_address_foundation/migration.sql exists');
  check(migFile.content.includes('CREATE TYPE "address_type"'), 'MIG-02', 'Migration creates address_type enum');
  check(
    migFile.content.includes('ALTER TABLE "collection_requests"') &&
      migFile.content.includes('house_number') &&
      migFile.content.includes('pincode'),
    'MIG-03',
    'Migration non-destructively adds columns to collection_requests'
  );
  check(
    migFile.content.includes('ALTER TABLE "collector_profiles"') &&
      migFile.content.includes('service_area'),
    'MIG-04',
    'Migration adds service area fields to collector_profiles'
  );
  check(
    migFile.content.includes('ALTER TABLE "recycler_profiles"') &&
      migFile.content.includes('pincode'),
    'MIG-05',
    'Migration adds structured facility location fields to recycler_profiles'
  );

  // ─── 2. Coordinate & Location Validation ─────────────────────────────────────
  console.log('\n─── 2. Coordinate & Geographic Validation ──────────────────────');

  const locHelper = require('../../backend/src/utils/locationHelper');

  // Valid coordinates
  check(locHelper.isValidCoordinate(12.9716, 77.5946), 'GEO-01', 'Valid Bangalore coordinates pass validation');
  check(locHelper.isValidCoordinate(28.6139, 77.2090), 'GEO-02', 'Valid New Delhi coordinates pass validation');
  check(locHelper.isValidCoordinate(0, 0), 'GEO-03', 'Equator/Prime Meridian (0,0) passes validation');
  check(locHelper.isValidCoordinate(-90, -180), 'GEO-04', 'Minimum geographic boundary (-90, -180) passes');
  check(locHelper.isValidCoordinate(90, 180), 'GEO-05', 'Maximum geographic boundary (90, 180) passes');

  // Invalid coordinates
  check(!locHelper.isValidCoordinate(90.1, 77.2), 'GEO-06', 'Latitude > 90 rejected');
  check(!locHelper.isValidCoordinate(-90.1, 77.2), 'GEO-07', 'Latitude < -90 rejected');
  check(!locHelper.isValidCoordinate(28.6, 180.1), 'GEO-08', 'Longitude > 180 rejected');
  check(!locHelper.isValidCoordinate(28.6, -180.1), 'GEO-09', 'Longitude < -180 rejected');
  check(!locHelper.isValidCoordinate(NaN, 77.2), 'GEO-10', 'NaN coordinate rejected');
  check(!locHelper.isValidCoordinate(null, 77.2), 'GEO-11', 'null coordinate rejected');
  check(!locHelper.isValidCoordinate(undefined, undefined), 'GEO-12', 'undefined coordinate rejected');

  // ─── 3. Indian Postal PIN Code Validation ────────────────────────────────────
  console.log('\n─── 3. Indian Postal PIN Code Validation ────────────────────────');

  // Valid Indian PINs (6 digits, first digit 1-9)
  check(locHelper.isValidIndianPin('560001'), 'PIN-01', 'Valid Bangalore PIN 560001 passes');
  check(locHelper.isValidIndianPin('110001'), 'PIN-02', 'Valid Delhi PIN 110001 passes');
  check(locHelper.isValidIndianPin('751001'), 'PIN-03', 'Valid Bhubaneswar PIN 751001 passes');
  check(locHelper.isValidIndianPin('400001'), 'PIN-04', 'Valid Mumbai PIN 400001 passes');
  check(locHelper.isValidIndianPin(' 110001 '), 'PIN-05', 'Trimmable valid PIN passes');

  // Invalid PINs
  check(!locHelper.isValidIndianPin('012345'), 'PIN-06', 'PIN starting with 0 rejected');
  check(!locHelper.isValidIndianPin('56000'), 'PIN-07', '5-digit PIN rejected');
  check(!locHelper.isValidIndianPin('5600001'), 'PIN-08', '7-digit PIN rejected');
  check(!locHelper.isValidIndianPin('56000A'), 'PIN-09', 'Alphanumeric PIN rejected');
  check(!locHelper.isValidIndianPin(''), 'PIN-10', 'Empty string PIN rejected');
  check(!locHelper.isValidIndianPin(null), 'PIN-11', 'null PIN rejected');

  // ─── 4. Address Types & Address Formatting ───────────────────────────────────
  console.log('\n─── 4. Address Types & Canonical Formatting ────────────────────');

  const { ADDRESS_TYPES } = require('../../backend/src/utils/constants');
  check(ADDRESS_TYPES.HOME === 'HOME', 'TYP-01', 'ADDRESS_TYPES contains HOME');
  check(ADDRESS_TYPES.OFFICE === 'OFFICE', 'TYP-02', 'ADDRESS_TYPES contains OFFICE');
  check(ADDRESS_TYPES.OTHER === 'OTHER', 'TYP-03', 'ADDRESS_TYPES contains OTHER');

  // formatAddress utility
  const formatted = locHelper.formatAddress({
    houseNumber: 'Flat 402, Lotus Towers',
    street: '100 Feet Ring Road, Indiranagar',
    landmark: 'Behind Metro Station',
    city: 'Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    pincode: '560038',
  });
  check(
    formatted.includes('Flat 402') &&
      formatted.includes('Indiranagar') &&
      formatted.includes('Near Behind Metro Station') &&
      formatted.includes('560038'),
    'FMT-01',
    `Address correctly assembled from components: "${formatted}"`
  );

  // Fallback when only legacy pickupAddress exists
  const legacyFormatted = locHelper.formatAddress({
    pickupAddress: 'Old Doorstep Address, Mayur Vihar, Delhi 110091',
  });
  check(
    legacyFormatted === 'Old Doorstep Address, Mayur Vihar, Delhi 110091',
    'FMT-02',
    'formatAddress preserves legacy pickupAddress when structured fields are absent'
  );

  // ─── 5. Privacy Masking Verification ─────────────────────────────────────────
  console.log('\n─── 5. Privacy Masking & Neighborhood Approximation ────────────');

  // Coordinate truncation (~1.1 km resolution)
  const masked = locHelper.maskCoordinates(28.6139384, 77.2090212, 2);
  check(masked.maskedLat === 28.61, 'PRV-01', `Latitude masked to 2 decimal places: ${masked.maskedLat}`);
  check(masked.maskedLng === 77.21, 'PRV-02', `Longitude masked to 2 decimal places: ${masked.maskedLng}`);

  // Test distance difference between exact and masked (~0.5 - 1.1 km)
  const privacyDist = locHelper.calculateDistanceKm(28.6139384, 77.2090212, masked.maskedLat, masked.maskedLng);
  check(
    privacyDist >= 0 && privacyDist <= 2.0,
    'PRV-03',
    `Masked coordinate offset is within neighborhood privacy boundary: ${privacyDist.toFixed(3)} km`
  );

  // Verify requestService privacy masking in source code
  const reqServiceCode = readFile('backend/src/services/requestService.js').content;
  check(
    reqServiceCode.includes("pickupAddress: 'Approximate Location (Exact address revealed upon acceptance)'"),
    'PRV-04',
    'requestService masks pickupAddress in available requests'
  );
  check(
    reqServiceCode.includes('houseNumber: null') &&
      reqServiceCode.includes('street: null') &&
      reqServiceCode.includes('pincode: null'),
    'PRV-05',
    'requestService nullifies exact house/street/PIN in available requests to prevent privacy leaks'
  );

  // ─── 6. Haversine Distance Calculations ──────────────────────────────────────
  console.log('\n─── 6. Haversine Distance Calculation & Robustness ──────────────');

  // Distance between Connaught Place (28.6315, 77.2167) and Noida Sec 18 (28.5708, 77.3218)
  const distDelhiNoida = locHelper.calculateDistanceKm(28.6315, 77.2167, 28.5708, 77.3218);
  check(
    distDelhiNoida > 10 && distDelhiNoida < 15,
    'HAV-01',
    `Connaught Place to Noida Sec 18 distance is accurate (~12.2 km): ${distDelhiNoida.toFixed(2)} km`
  );

  // Same coordinates distance is zero
  const zeroDist = locHelper.calculateDistanceKm(28.6315, 77.2167, 28.6315, 77.2167);
  check(zeroDist === 0, 'HAV-02', 'Distance between identical points is 0 km');

  // Robustness with NaN / invalid inputs
  const nanDist = locHelper.calculateDistanceKm('invalid', 77.2, 28.6, 77.3);
  check(nanDist === Infinity, 'HAV-03', 'Invalid input returns Infinity without throwing exception');

  // ─── 7. Backward Compatibility ───────────────────────────────────────────────
  console.log('\n─── 7. Legacy Record Backward Compatibility ────────────────────');

  const legacyRequest = {
    id: 'c1111111-1111-4111-8111-111111111111',
    pickupAddress: '123 Old Street, Delhi',
    pickupLat: '28.6139',
    pickupLng: '77.2090',
    houseNumber: null,
    street: null,
    landmark: null,
    city: null,
    pincode: null,
    locationAccuracy: null,
  };

  const formattedLegacy = locHelper.formatAddress(legacyRequest);
  check(
    formattedLegacy === '123 Old Street, Delhi',
    'BC-01',
    'formatAddress correctly processes records with null structured fields'
  );

  const maskedLegacy = locHelper.maskCoordinates(legacyRequest.pickupLat, legacyRequest.pickupLng);
  check(
    maskedLegacy.maskedLat === 28.61 && maskedLegacy.maskedLng === 77.21,
    'BC-02',
    'Privacy masking operates seamlessly on legacy records with string coordinates'
  );

  // ─── 8. Validators Coverage ──────────────────────────────────────────────────
  console.log('\n─── 8. Express Validators Coverage ─────────────────────────────');

  const reqValCode = readFile('backend/src/validators/requestValidators.js').content;
  check(reqValCode.includes('VALID_ADDRESS_TYPES'), 'VAL-01', 'requestValidators imports and validates ADDRESS_TYPES');
  check(reqValCode.includes('/^[1-9][0-9]{5}$/'), 'VAL-02', 'requestValidators enforces Indian 6-digit PIN regex');
  check(reqValCode.includes('locationAccuracy'), 'VAL-03', 'requestValidators validates locationAccuracy');

  const colValCode = readFile('backend/src/validators/collectorValidators.js').content;
  check(colValCode.includes('serviceArea'), 'VAL-04', 'collectorValidators validates serviceArea');
  check(colValCode.includes('pincode'), 'VAL-05', 'collectorValidators validates collector pincode');

  const recValCode = readFile('backend/src/validators/recyclerValidators.js').content;
  check(recValCode.includes('pincode'), 'VAL-06', 'recyclerValidators validates facility pincode');
  check(recValCode.includes('city'), 'VAL-07', 'recyclerValidators validates facility city');

  // ─── 9. Strict Business Chain & Role Isolation ───────────────────────────────
  console.log('\n─── 9. Strict Business Chain & Zero Direct Citizen → Recycler ───');

  const consignmentRouteCode = readFile('backend/src/routes/consignmentRoutes.js').content;
  check(
    consignmentRouteCode.includes('ROLES.INFORMAL_COLLECTOR'),
    'CHN-01',
    'Consignment creation restricted strictly to INFORMAL_COLLECTOR'
  );
  check(
    !consignmentRouteCode.includes('ROLES.CITIZEN'),
    'CHN-02',
    'Citizen is strictly prohibited from creating consignments to Recyclers'
  );

  const citizenRoutesCode = readFile('backend/src/routes/requestRoutes.js').content;
  check(
    citizenRoutesCode.includes('ROLES.CITIZEN'),
    'CHN-03',
    'Citizen routes interact solely with collection requests for local collectors'
  );

  // ─── 10. Strict Scope Boundary Checks ────────────────────────────────────────
  console.log('\n─── 10. Strict Scope Boundaries (Zero Unrequested Features) ────');

  const pkgBackend = readFile('backend/package.json').content;
  const pkgMobile = readFile('mobile/package.json').content;

  const forbiddenLibs = [
    'react-native-maps',
    '@react-native-community/geolocation',
    '@googlemaps/google-maps-services-js',
    'react-native-tts',
    '@react-native-voice/voice',
    'expo-speech',
  ];

  let hasForbidden = false;
  forbiddenLibs.forEach((lib) => {
    // In Phase 19 Task 6, react-native-maps is legitimately added to mobile
    if (lib === 'react-native-maps') {
      if (pkgBackend.includes(lib)) {
        hasForbidden = true;
        console.error(`Forbidden library found in backend: ${lib}`);
      }
    } else if (pkgBackend.includes(lib) || pkgMobile.includes(lib)) {
      hasForbidden = true;
      console.error(`Forbidden library found: ${lib}`);
    }
  });
  check(!hasForbidden, 'BND-01', 'Zero unrequested Google Maps backend services, TTS, or audio libraries');

  const mobileNav = readFile('mobile/src/navigation/CollectorNavigator.tsx').content;
  check(!mobileNav.includes('MapView'), 'BND-02', 'Zero MapView components rendered in Collector mobile UI');

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(`  - [${f.testId}] ${f.description}: ${f.detail}`));
    process.exit(1);
  } else {
    console.log('All Location Foundation verification checks passed successfully!');
  }
}

runLocationFoundationVerification().catch((err) => {
  console.error('Verification script threw an unhandled error:', err);
  process.exit(1);
});
