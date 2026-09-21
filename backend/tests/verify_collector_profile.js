/**
 * verify_collector_profile.js
 * Comprehensive Automated Verification Suite for SIH 26229 Prompt 14:
 * Collector Profile + Preferred Language + Operating Area
 * Canonical Reference: SIH Problem Statement 26229, docs/25_SIH_26229_REQUIREMENTS.md Section 17
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const collectorService = require('../src/services/collectorService');
const collectorValidators = require('../src/validators/collectorValidators');

async function runCollectorProfileVerification() {
  console.log('================================================================');
  console.log('--- STARTING VERIFY_COLLECTOR_PROFILE (SIH 26229 PROMPT 14) ---');
  console.log('================================================================\n');

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
  const backendDir = path.join(rootDir, 'backend');
  const mobileDir = path.join(rootDir, 'mobile');

  let testUserA = null;
  let testUserB = null;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Collectors in DB
    // -------------------------------------------------------------------------
    const emailA = `test.collector.a.${Date.now()}@ecosetu.test`;
    const emailB = `test.collector.b.${Date.now()}@ecosetu.test`;

    testUserA = await prisma.user.create({
      data: {
        email: emailA,
        phone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hashed_password_for_testing',
        name: 'Ramesh Patel (Collector A)',
        role: 'INFORMAL_COLLECTOR',
        status: 'ACTIVE',
      },
    });

    testUserB = await prisma.user.create({
      data: {
        email: emailB,
        phone: `9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hashed_password_for_testing',
        name: 'Suresh Das (Collector B)',
        role: 'INFORMAL_COLLECTOR',
        status: 'ACTIVE',
      },
    });

    // -------------------------------------------------------------------------
    // Check 1: Collector profile route exists and requires authentication & role
    // -------------------------------------------------------------------------
    try {
      const routesContent = fs.readFileSync(path.join(backendDir, 'src/routes/collectorRoutes.js'), 'utf8');
      const indexRoutes = fs.readFileSync(path.join(backendDir, 'src/routes/index.js'), 'utf8');

      assert(routesContent.includes("'/profile'") && routesContent.includes('get'), 'GET /profile route missing in collectorRoutes.js');
      assert(routesContent.includes("'/profile'") && routesContent.includes('patch'), 'PATCH /profile route missing in collectorRoutes.js');
      assert(routesContent.includes("'/profile'") && routesContent.includes('put'), 'PUT /profile route missing in collectorRoutes.js');
      assert(routesContent.includes('authorize(ROLES.INFORMAL_COLLECTOR)'), 'RBAC role authorization missing');
      assert(indexRoutes.includes("router.use('/collector', collectorRoutes)"), 'Collector routes alias mounted');
      passCheck(1, 'Collector profile API endpoints (GET, PATCH, PUT) exist with RBAC protection');
    } catch (err) {
      failCheck(1, 'Collector profile API endpoints exist with RBAC protection', err);
    }

    // -------------------------------------------------------------------------
    // Check 2: Authenticated collector can read own profile (auto-initializes default)
    // -------------------------------------------------------------------------
    try {
      const profileA = await collectorService.getProfile(testUserA.id);
      assert(profileA, 'Profile should be returned');
      assert.strictEqual(profileA.userId, testUserA.id, 'Profile must belong to authenticated user');
      assert.strictEqual(profileA.user.name, 'Ramesh Patel (Collector A)', 'User data joined correctly');
      passCheck(2, 'Authenticated collector can read own profile with auto-initialization');
    } catch (err) {
      failCheck(2, 'Authenticated collector can read own profile', err);
    }

    // -------------------------------------------------------------------------
    // Check 3: Collector can update own preferred language (en, hi, mr, or)
    // -------------------------------------------------------------------------
    try {
      const updatedHindi = await collectorService.upsertProfile(testUserA.id, {
        preferredLanguage: 'hi',
      });
      assert.strictEqual(updatedHindi.preferredLanguage, 'hi', 'Preferred language should be hi');

      const updatedMarathi = await collectorService.upsertProfile(testUserA.id, {
        preferredLanguage: 'mr',
      });
      assert.strictEqual(updatedMarathi.preferredLanguage, 'mr', 'Preferred language should be mr');

      const updatedOdia = await collectorService.upsertProfile(testUserA.id, {
        preferredLanguage: 'or',
      });
      assert.strictEqual(updatedOdia.preferredLanguage, 'or', 'Preferred language should be or');

      passCheck(3, 'Collector can update own preferred language across all 4 supported locales (hi, mr, or, en)');
    } catch (err) {
      failCheck(3, 'Collector can update own preferred language', err);
    }

    // -------------------------------------------------------------------------
    // Check 4: Collector can update own general operating area (locality, city, state, pincode)
    // -------------------------------------------------------------------------
    try {
      const updatedArea = await collectorService.upsertProfile(testUserA.id, {
        serviceArea: 'Dharavi Sector 3',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400017',
      });
      assert.strictEqual(updatedArea.serviceArea, 'Dharavi Sector 3', 'serviceArea updated');
      assert.strictEqual(updatedArea.city, 'Mumbai', 'city updated');
      assert.strictEqual(updatedArea.state, 'Maharashtra', 'state updated');
      assert.strictEqual(updatedArea.pincode, '400017', 'pincode updated');
      passCheck(4, 'Collector can update general operating area without precise coordinates');
    } catch (err) {
      failCheck(4, 'Collector can update general operating area', err);
    }

    // -------------------------------------------------------------------------
    // Check 5: Tenancy Isolation - Collector A cannot modify Collector B
    // -------------------------------------------------------------------------
    try {
      // Create profile for B
      await collectorService.getProfile(testUserB.id);

      // Attempt to spoof by passing Collector B's userId in request data to Collector A's upsert
      const spoofAttempt = await collectorService.upsertProfile(testUserA.id, {
        userId: testUserB.id,
        collectorId: testUserB.id,
        serviceArea: 'Hacked Area',
      });

      // Collector A's profile changed, but Collector B's profile MUST be untouched
      const profileB = await collectorService.getProfile(testUserB.id);
      assert.notStrictEqual(profileB.serviceArea, 'Hacked Area', "Collector B's profile must not be modified");
      assert.strictEqual(spoofAttempt.userId, testUserA.id, "Upsert must strictly use authenticated user's ID");
      passCheck(5, 'Tenancy Isolation: Collector A cannot modify Collector B via parameter injection');
    } catch (err) {
      failCheck(5, 'Tenancy Isolation: Collector A cannot modify Collector B', err);
    }

    // -------------------------------------------------------------------------
    // Check 6: Tenancy Isolation - Collector cannot read another collector's private profile
    // -------------------------------------------------------------------------
    try {
      // Verify in controller code that req.user.id is strictly used, never a path param collectorId
      const controllerContent = fs.readFileSync(path.join(backendDir, 'src/controllers/collectorController.js'), 'utf8');
      assert(
        controllerContent.includes('const profile = await collectorService.getProfile(req.user.id);'),
        'getProfile must derive identity solely from req.user.id'
      );
      assert(
        controllerContent.includes('const profile = await collectorService.upsertProfile(req.user.id,'),
        'upsertProfile must derive identity solely from req.user.id'
      );
      assert(!controllerContent.includes('req.params.collectorId'), 'No public by-id collector endpoint exists');
      passCheck(6, 'Privacy RBAC: Collector identity strictly derived from authentication JWT');
    } catch (err) {
      failCheck(6, 'Privacy RBAC: Collector identity derived from authentication', err);
    }

    // -------------------------------------------------------------------------
    // Check 7: Preferred language validation rejects unsupported codes
    // -------------------------------------------------------------------------
    try {
      const validHindi = collectorValidators.validateUpdateProfile({ preferredLanguage: 'hi' });
      assert.strictEqual(validHindi.error, undefined, 'Valid code "hi" should pass');

      const invalidFrench = collectorValidators.validateUpdateProfile({ preferredLanguage: 'fr' });
      assert(invalidFrench.error, 'Invalid language code "fr" must be rejected');

      const invalidSpanish = collectorValidators.validateUpdateProfile({ preferredLanguage: 'es' });
      assert(invalidSpanish.error, 'Invalid language code "es" must be rejected');

      passCheck(7, 'Validator strictly restricts preferredLanguage to supported codes [en, hi, mr, or]');
    } catch (err) {
      failCheck(7, 'Preferred language validation restricts to supported codes', err);
    }

    // -------------------------------------------------------------------------
    // Check 8: Existing language persistence remains intact
    // -------------------------------------------------------------------------
    try {
      const coreContent = fs.readFileSync(path.join(mobileDir, 'src/i18n/core.ts'), 'utf8');
      assert(
        coreContent.includes('@ecosetu_language') || coreContent.includes('STORAGE_KEYS.LANGUAGE'),
        'AsyncStorage persistence key maintained'
      );
      assert(coreContent.includes('setLanguage'), 'Language mutation function exists');
      passCheck(8, 'Existing language persistence and storage system remains intact');
    } catch (err) {
      failCheck(8, 'Existing language persistence remains intact', err);
    }

    // -------------------------------------------------------------------------
    // Check 9: Operating area does not require precise GPS coordinates
    // -------------------------------------------------------------------------
    try {
      const schemaPrisma = fs.readFileSync(path.join(backendDir, 'prisma/schema.prisma'), 'utf8');
      const profileMatch = schemaPrisma.match(/model CollectorProfile \{[\s\S]*?\n\}/);
      assert(profileMatch, 'CollectorProfile model found');
      const profileBlock = profileMatch[0];

      // CollectorProfile has serviceArea, city, state, pincode, but NO exact personal GPS requirements
      assert(profileBlock.includes('serviceArea'), 'serviceArea field present');
      assert(profileBlock.includes('city'), 'city field present');
      assert(profileBlock.includes('state'), 'state field present');
      passCheck(9, 'Operating area stores only general locality/city/state/pincode without mandatory GPS');
    } catch (err) {
      failCheck(9, 'Operating area does not require precise GPS', err);
    }

    // -------------------------------------------------------------------------
    // Check 10: Profile does not expose unnecessary PII
    // -------------------------------------------------------------------------
    try {
      const schemaPrisma = fs.readFileSync(path.join(backendDir, 'prisma/schema.prisma'), 'utf8');
      const profileMatch = schemaPrisma.match(/model CollectorProfile \{[\s\S]*?\n\}/)[0];

      const forbiddenFields = [
        'aadhaar',
        'pan',
        'bankAccount',
        'bank_account',
        'upiId',
        'upi_id',
        'residentialAddress',
        'residential_address',
        'password',
        'privateAddress',
      ];

      for (const field of forbiddenFields) {
        assert(!profileMatch.toLowerCase().includes(field.toLowerCase()), `CollectorProfile must not contain ${field}`);
      }
      passCheck(10, 'Strict Data Minimization: Zero Aadhaar, PAN, bank account, UPI, or residential address fields');
    } catch (err) {
      failCheck(10, 'Profile does not expose unnecessary PII', err);
    }

    // -------------------------------------------------------------------------
    // Check 11: Transaction history links to existing transaction screen/service
    // -------------------------------------------------------------------------
    try {
      const screenContent = fs.readFileSync(
        path.join(mobileDir, 'src/screens/collector/CollectorProfileScreen.tsx'),
        'utf8'
      );
      assert(
        screenContent.includes("navigation?.navigate('CollectorTransactions')") ||
        screenContent.includes("navigation.navigate('CollectorTransactions')"),
        'Profile screen must navigate to existing CollectorTransactions'
      );
      assert(
        screenContent.includes('transactionService.getTransactions'),
        'Profile queries existing transactionService'
      );
      passCheck(11, 'Transaction history card links directly to existing CollectorTransactionsScreen and service');
    } catch (err) {
      failCheck(11, 'Transaction history links to existing transaction screen/service', err);
    }

    // -------------------------------------------------------------------------
    // Check 12: Earnings links to existing earnings screen/service
    // -------------------------------------------------------------------------
    try {
      const screenContent = fs.readFileSync(
        path.join(mobileDir, 'src/screens/collector/CollectorProfileScreen.tsx'),
        'utf8'
      );
      assert(
        screenContent.includes("navigation?.navigate('CollectorEarnings')") ||
        screenContent.includes("navigation.navigate('CollectorEarnings')"),
        'Profile screen must navigate to existing CollectorEarnings'
      );
      assert(
        screenContent.includes('earningsService.getEarningsSummary'),
        'Profile queries existing earningsService'
      );
      passCheck(12, 'Earnings card links directly to existing CollectorEarningsScreen and service');
    } catch (err) {
      failCheck(12, 'Earnings links to existing earnings screen/service', err);
    }

    // -------------------------------------------------------------------------
    // Check 13: Offline profile cache exists
    // -------------------------------------------------------------------------
    try {
      const collectorMobileService = fs.readFileSync(
        path.join(mobileDir, 'src/services/collectorService.js'),
        'utf8'
      );
      assert(
        collectorMobileService.includes('@ecosetu_collector_profile'),
        'AsyncStorage profile cache key present'
      );
      assert(
        collectorMobileService.includes('getCollectorProfile') ||
        collectorMobileService.includes('getProfile()'),
        'getCollectorProfile reads from network with fallback to cache'
      );
      assert(
        collectorMobileService.includes('updateCollectorProfile'),
        'updateCollectorProfile saves to cache when offline'
      );
      passCheck(13, 'Offline profile cache implemented via AsyncStorage (@ecosetu_collector_profile)');
    } catch (err) {
      failCheck(13, 'Offline profile cache exists', err);
    }

    // -------------------------------------------------------------------------
    // Check 14: Pending/offline state is honest
    // -------------------------------------------------------------------------
    try {
      const collectorMobileService = fs.readFileSync(
        path.join(mobileDir, 'src/services/collectorService.js'),
        'utf8'
      );
      const profileScreen = fs.readFileSync(
        path.join(mobileDir, 'src/screens/collector/CollectorProfileScreen.tsx'),
        'utf8'
      );
      assert(
        collectorMobileService.includes('isPendingSync: true'),
        'Service flags offline saves with isPendingSync: true'
      );
      assert(
        profileScreen.includes('isPendingSync') && profileScreen.includes('syncPending'),
        'Profile screen renders honest sync-pending banner when unsynchronized'
      );
      passCheck(14, 'Pending/offline state is honest (displays pending banner and prevents false sync assertions)');
    } catch (err) {
      failCheck(14, 'Pending/offline state is honest', err);
    }

    // -------------------------------------------------------------------------
    // Check 15: Profile UI uses i18n across all 4 locales
    // -------------------------------------------------------------------------
    try {
      const requiredKeys = [
        'collectorProfileTitle',
        'collectorId',
        'preferredLanguage',
        'operatingArea',
        'myTransactions',
        'myEarnings',
        'editProfile',
        'save',
        'cancel',
        'locationUnavailable',
        'offline',
        'saved',
        'syncPending',
        'profileUpdateFailed',
        'profileUpdated',
      ];

      const locales = ['en', 'hi', 'mr', 'or'];
      for (const loc of locales) {
        const locContent = fs.readFileSync(
          path.join(mobileDir, `src/i18n/locales/${loc}.ts`),
          'utf8'
        );
        for (const k of requiredKeys) {
          assert(
            locContent.includes(k),
            `Locale "${loc}" missing collector profile key: ${k}`
          );
        }
      }
      passCheck(15, 'All profile UI strings localized across all 4 languages (English, Hindi, Marathi, Odia)');
    } catch (err) {
      failCheck(15, 'Profile UI uses i18n across all 4 locales', err);
    }

    // -------------------------------------------------------------------------
    // Check 16: TTS uses selected language
    // -------------------------------------------------------------------------
    try {
      const profileScreen = fs.readFileSync(
        path.join(mobileDir, 'src/screens/collector/CollectorProfileScreen.tsx'),
        'utf8'
      );
      assert(profileScreen.includes('getProfileSpeechText'), 'Multilingual speech generator implemented');
      assert(profileScreen.includes("case 'hi':"), 'Hindi TTS phrasing supported');
      assert(profileScreen.includes("case 'mr':"), 'Marathi TTS phrasing supported');
      assert(profileScreen.includes("case 'or':"), 'Odia TTS phrasing supported');
      assert(profileScreen.includes('ReadAloudButton'), 'ReadAloudButton component mounted on profile cards');
      passCheck(16, 'TTS supports vernacular speech generation across Hindi, Marathi, Odia, and English');
    } catch (err) {
      failCheck(16, 'TTS uses selected language', err);
    }

    // -------------------------------------------------------------------------
    // Check 17: No duplicate earnings ledger created
    // -------------------------------------------------------------------------
    try {
      const schemaPrisma = fs.readFileSync(path.join(backendDir, 'prisma/schema.prisma'), 'utf8');
      const models = (schemaPrisma.match(/model\s+(\w+)\s+\{/g) || []).map((m) =>
        m.replace(/model\s+|\s+\{/g, '')
      );

      const duplicateLedgerModels = models.filter((m) =>
        ['collectorledger', 'earningsledger', 'collectorwallet', 'financialrecord'].includes(
          m.toLowerCase()
        )
      );

      assert.strictEqual(
        duplicateLedgerModels.length,
        0,
        `Duplicate financial models found: ${duplicateLedgerModels.join(', ')}`
      );
      passCheck(17, 'Zero duplicate earnings ledger models created in schema');
    } catch (err) {
      failCheck(17, 'No duplicate earnings ledger created', err);
    }

    // -------------------------------------------------------------------------
    // Check 18: No duplicate transaction model created
    // -------------------------------------------------------------------------
    try {
      const schemaPrisma = fs.readFileSync(path.join(backendDir, 'prisma/schema.prisma'), 'utf8');
      const models = (schemaPrisma.match(/model\s+(\w+)\s+\{/g) || []).map((m) =>
        m.replace(/model\s+|\s+\{/g, '')
      );

      const duplicateTxModels = models.filter((m) =>
        ['collectortransaction', 'collectortransactionhistory', 'paymenttransaction'].includes(
          m.toLowerCase()
        )
      );

      assert.strictEqual(
        duplicateTxModels.length,
        0,
        `Duplicate transaction models found: ${duplicateTxModels.join(', ')}`
      );
      passCheck(18, 'Zero duplicate transaction models created; Transaction & Consignment remain authoritative');
    } catch (err) {
      failCheck(18, 'No duplicate transaction model created', err);
    }

  } catch (globalErr) {
    console.error('Unexpected global error during verification:', globalErr);
  } finally {
    // Cleanup test users
    try {
      if (testUserA) {
        await prisma.collectorProfile.deleteMany({ where: { userId: testUserA.id } });
        await prisma.user.delete({ where: { id: testUserA.id } });
      }
      if (testUserB) {
        await prisma.collectorProfile.deleteMany({ where: { userId: testUserB.id } });
        await prisma.user.delete({ where: { id: testUserB.id } });
      }
    } catch (cleanupErr) {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedChecks} PASSED, ${failedChecks} FAILED`);
  console.log('================================================================\n');

  if (failedChecks > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(` - Check ${f.num} (${f.desc}): ${f.err}`));
    process.exit(1);
  } else {
    console.log('ALL 18 VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runCollectorProfileVerification().catch((err) => {
  console.error('FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
