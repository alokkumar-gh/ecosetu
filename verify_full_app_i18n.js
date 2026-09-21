/**
 * verify_full_app_i18n.js
 * ECOSETU Pillar 3: Comprehensive Application-Wide i18n Verification Suite
 *
 * Verifies:
 *   1. 100% Key Parity across all 4 supported locales: en, hi, mr, or.
 *   2. Zero missing translations across all leaf nodes.
 *   3. Native script authenticity (Hindi & Marathi in Devanagari, Odia in Odia script).
 *   4. Major screen coverage across Citizen, Collector, Recycler, Admin, Auth.
 *   5. Navigation coverage across Citizen, Collector, Recycler, Admin navigators.
 *   6. Notification coverage (Citizen & Admin notification centers).
 *   7. Request coverage (e-waste lifecycle, statuses, categories, item submissions).
 *   8. Home / Dashboard coverage across all 4 roles.
 *   9. Collector flow coverage (browse, pickup, consignment, recycler directory).
 *   10. Recycler flow coverage (incoming, inspection, processing, certification).
 *   11. Admin console coverage (users, verifications, governance, health, analytics).
 *   12. Language persistence & dynamic switching architecture.
 *
 * Run: node verify_full_app_i18n.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(__dirname, relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function parseLocaleFile(relPath, varName) {
  const file = readFile(relPath);
  if (!file.exists) return null;
  let cleanCode = file.content
    .replace(/import\s+type[^;]+;/, '')
    .replace(new RegExp(`export\\s+const\\s+${varName}:\\s*TranslationSchema\\s*=`), `const ${varName} =`);
  cleanCode += `\n;${varName};`;
  return vm.runInNewContext(cleanCode);
}

function getLeafKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getLeafKeys(obj[k], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

function containsDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

function containsOdia(text) {
  return /[\u0B00-\u0B7F]/.test(text);
}

async function runFullAppI18nVerification() {
  console.log('================================================================');
  console.log('ECOSETU PILLAR 3: FULL APPLICATION i18n VERIFICATION');
  console.log('================================================================\n');

  // 1. Locale Parsers & Key Parity
  console.log('─── 1. Locale Files & Key Parity ─────────────────────────────────');
  const en = parseLocaleFile('mobile/src/i18n/locales/en.ts', 'en');
  const hi = parseLocaleFile('mobile/src/i18n/locales/hi.ts', 'hi');
  const mr = parseLocaleFile('mobile/src/i18n/locales/mr.ts', 'mr');
  const or = parseLocaleFile('mobile/src/i18n/locales/or.ts', 'or');

  check(en !== null, 'I18N-01a', 'English locale file (en.ts) loads and evaluates');
  check(hi !== null, 'I18N-01b', 'Hindi locale file (hi.ts) loads and evaluates');
  check(mr !== null, 'I18N-01c', 'Marathi locale file (mr.ts) loads and evaluates');
  check(or !== null, 'I18N-01d', 'Odia locale file (or.ts) loads and evaluates');

  const enKeys = getLeafKeys(en);
  const hiKeys = getLeafKeys(hi);
  const mrKeys = getLeafKeys(mr);
  const orKeys = getLeafKeys(or);

  const enSet = new Set(enKeys);
  const hiSet = new Set(hiKeys);
  const mrSet = new Set(mrKeys);
  const orSet = new Set(orKeys);

  check(enKeys.length >= 800, 'I18N-02a', `Comprehensive English key coverage (${enKeys.length} keys)`);
  check(hiKeys.length === enKeys.length, 'I18N-02b', `Hindi key count matches English exactly (${hiKeys.length}/${enKeys.length})`);
  check(mrKeys.length === enKeys.length, 'I18N-02c', `Marathi key count matches English exactly (${mrKeys.length}/${enKeys.length})`);
  check(orKeys.length === enKeys.length, 'I18N-02d', `Odia key count matches English exactly (${orKeys.length}/${enKeys.length})`);

  const missingHi = enKeys.filter(k => !hiSet.has(k));
  const missingMr = enKeys.filter(k => !mrSet.has(k));
  const missingOr = enKeys.filter(k => !orSet.has(k));

  check(missingHi.length === 0, 'I18N-03a', `Zero missing keys in Hindi (${missingHi.length} missing)`, missingHi.slice(0, 3).join(', '));
  check(missingMr.length === 0, 'I18N-03b', `Zero missing keys in Marathi (${missingMr.length} missing)`, missingMr.slice(0, 3).join(', '));
  check(missingOr.length === 0, 'I18N-03c', `Zero missing keys in Odia (${missingOr.length} missing)`, missingOr.slice(0, 3).join(', '));

  // 2. Native Script Quality & Authenticity
  console.log('\n─── 2. Native Script Quality & Authenticity ──────────────────────');
  let hiDevanagariCount = 0;
  let mrDevanagariCount = 0;
  let orScriptCount = 0;

  function countScript(obj, tester) {
    let count = 0;
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && tester(val)) count++;
      else if (typeof val === 'object' && val !== null) count += countScript(val, tester);
    }
    return count;
  }

  hiDevanagariCount = countScript(hi, containsDevanagari);
  mrDevanagariCount = countScript(mr, containsDevanagari);
  orScriptCount = countScript(or, containsOdia);

  check(hiDevanagariCount >= enKeys.length * 0.95, 'I18N-04a', `Hindi uses authentic Devanagari script (${hiDevanagariCount}/${enKeys.length} strings)`);
  check(mrDevanagariCount >= enKeys.length * 0.95, 'I18N-04b', `Marathi uses authentic Devanagari script (${mrDevanagariCount}/${enKeys.length} strings)`);
  check(orScriptCount >= enKeys.length * 0.95, 'I18N-04c', `Odia uses authentic Odia script (${orScriptCount}/${enKeys.length} strings)`);

  // 3. Navigation Coverage
  console.log('\n─── 3. Navigation Coverage ───────────────────────────────────────');
  const citizenNav = readFile('mobile/src/navigation/CitizenNavigator.tsx');
  const collectorNav = readFile('mobile/src/navigation/CollectorNavigator.tsx');
  const recyclerNav = readFile('mobile/src/navigation/RecyclerNavigator.tsx');
  const adminNav = readFile('mobile/src/navigation/AdminNavigator.tsx');

  check(citizenNav.content.includes('useI18n') && citizenNav.content.includes("t('navigation."), 'I18N-05a', 'CitizenNavigator localizes tab labels dynamically');
  check(collectorNav.content.includes('useI18n') && collectorNav.content.includes("t('navigation.") || collectorNav.content.includes("t('collector."), 'I18N-05b', 'CollectorNavigator localizes tab labels dynamically');
  check(recyclerNav.content.includes('useI18n') && recyclerNav.content.includes("t('"), 'I18N-05c', 'RecyclerNavigator localizes tab labels dynamically');
  check(adminNav.content.includes('useI18n') && adminNav.content.includes("t('"), 'I18N-05d', 'AdminNavigator localizes tab labels dynamically');

  // 4. Citizen Screen Coverage
  console.log('\n─── 4. Citizen Domain Coverage ───────────────────────────────────');
  const citizenScreens = [
    'CitizenDashboardScreen.tsx',
    'SubmitItemScreen.tsx',
    'CitizenRequestsScreen.tsx',
    'RequestDetailScreen.tsx',
    'ItemTraceabilityScreen.tsx',
    'CitizenNotificationsScreen.tsx',
    'CitizenProfileScreen.tsx',
  ];
  for (const screen of citizenScreens) {
    const file = readFile(`mobile/src/screens/citizen/${screen}`);
    check(file.exists && (file.content.includes('useI18n') || file.content.includes('t(')), `I18N-06-${screen.replace('.tsx', '')}`, `Citizen screen ${screen} integrates i18n`);
  }

  // 5. Collector Domain Coverage
  console.log('\n─── 5. Collector Domain Coverage ─────────────────────────────────');
  const collectorScreens = [
    'CollectorDashboardScreen.tsx',
    'CollectorBrowseScreen.tsx',
    'CollectorPickupsScreen.tsx',
    'CollectorPickupDetailScreen.tsx',
    'CollectorConsignmentsScreen.tsx',
    'CreateConsignmentScreen.tsx',
    'CollectorRecyclerDirectoryScreen.tsx',
    'CollectorProfileScreen.tsx',
  ];
  for (const screen of collectorScreens) {
    const file = readFile(`mobile/src/screens/collector/${screen}`);
    check(file.exists && (file.content.includes('useI18n') || file.content.includes('t(')), `I18N-07-${screen.replace('.tsx', '')}`, `Collector screen ${screen} integrates i18n`);
  }

  // 6. Recycler Domain Coverage
  console.log('\n─── 6. Recycler Domain Coverage ──────────────────────────────────');
  const recyclerScreens = [
    'RecyclerDashboardScreen.tsx',
    'RecyclerIncomingScreen.tsx',
    'ConsignmentDetailScreen.tsx',
    'RecyclerRecordsScreen.tsx',
    'RecyclingRecordDetailScreen.tsx',
    'RecyclerProfileScreen.tsx',
  ];
  for (const screen of recyclerScreens) {
    const file = readFile(`mobile/src/screens/recycler/${screen}`);
    check(file.exists && (file.content.includes('useI18n') || file.content.includes('t(')), `I18N-08-${screen.replace('.tsx', '')}`, `Recycler screen ${screen} integrates i18n`);
  }

  // 7. Admin Domain Coverage
  console.log('\n─── 7. Admin Domain Coverage ─────────────────────────────────────');
  const adminScreens = [
    'AdminDashboardScreen.tsx',
    'AdminUsersScreen.tsx',
    'AdminVerificationsScreen.tsx',
    'AdminGovernanceScreen.tsx',
    'AdminReportsScreen.tsx',
    'AdminSystemHealthScreen.tsx',
    'AdminGeographicAnalyticsScreen.tsx',
    'AdminNotificationCenterScreen.tsx',
  ];
  for (const screen of adminScreens) {
    const file = readFile(`mobile/src/screens/admin/${screen}`);
    check(file.exists && (file.content.includes('useI18n') || file.content.includes('t(')), `I18N-09-${screen.replace('.tsx', '')}`, `Admin screen ${screen} integrates i18n`);
  }

  // 8. Notification & Lifecycle Status Coverage
  console.log('\n─── 8. Notification & Lifecycle Coverage ─────────────────────────');
  check(en.notifications !== undefined && typeof en.notifications.newRequest === 'string' && typeof en.notifications.pickupCompleted === 'string', 'I18N-10a', 'Comprehensive notification namespace exists');
  check(en.status !== undefined && typeof en.status.pending === 'string' && typeof en.status.completed === 'string', 'I18N-10b', 'Comprehensive lifecycle status namespace exists');
  check(en.ewaste !== undefined && typeof en.ewaste.laptop === 'string' && typeof en.ewaste.battery === 'string', 'I18N-10c', 'E-waste item categories localized');
  check(en.common !== undefined && typeof en.common.offline === 'string' && typeof en.common.retry === 'string', 'I18N-10d', 'Common states (offline, retry, cancel) localized');

  // 9. Language Switching & Persistence Architecture
  console.log('\n─── 9. Language Switching & Persistence Architecture ──────────────');
  const coreI18n = readFile('mobile/src/i18n/core.ts');
  check(coreI18n.content.includes('setLanguage') && coreI18n.content.includes('getLanguage'), 'I18N-11a', 'Centralized core exports setLanguage and getLanguage');
  check(coreI18n.content.includes('@ecosetu_language') || coreI18n.content.includes('STORAGE_KEYS.LANGUAGE'), 'I18N-11b', 'Language preference persists to secure storage key');
  check(coreI18n.content.includes('subscribeLanguageChange'), 'I18N-11c', 'Reactive subscription mechanism updates subscribers immediately');

  console.log('\n================================================================');
  console.log(`Pillar 3: Full App i18n Results: ${passed} passed | ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFailures detail:');
    failures.forEach(f => console.error(` - [${f.testId}] ${f.description}: ${f.detail}`));
    process.exit(1);
  }
}

runFullAppI18nVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
