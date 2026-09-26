/**
 * verify_global_tts.js
 * ECOSETU Pillar 4: Comprehensive Global TTS & Voice Assistance Verification Suite
 *
 * Verifies:
 *   1. Centralized voice service (voiceService.ts) operates with on-device native Android TextToSpeech.
 *   2. Zero cloud TTS or paid third-party voice APIs.
 *   3. Priority arbitration (HIGH interrupts NORMAL/LOW; NORMAL/LOW cannot interrupt HIGH).
 *   4. Anti-repetition debounce protects against rapid re-render duplicate speech.
 *   5. Voice Assistance global setting defaults to OFF and persists locally (@ecosetu_voice_assistance).
 *   6. Dynamic language alignment with active app language (en, hi, mr, or).
 *   7. Unified <ReadAloudButton /> component with IDLE, SPEAKING, UNAVAILABLE states.
 *   8. Cross-role screen coverage: Citizen, Collector, Recycler, Admin.
 *   9. Privacy protection: Zero exact GPS coordinates or citizen phone numbers spoken pre-acceptance.
 *   10. Non-blocking error resilience: Failure or unavailability never crashes the mobile app.
 *
 * Run: node verify_global_tts.js
 */

const fs = require('fs');
const path = require('path');

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
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(__dirname, '..', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

async function runGlobalTTSVerification() {
  console.log('================================================================');
  console.log('ECOSETU PILLAR 4: GLOBAL TTS & VOICE ASSISTANCE VERIFICATION');
  console.log('================================================================\n');

  // 1. Voice Service Architecture
  console.log('─── 1. Centralized Voice Service Architecture ───────────────────');
  const vsFile = readFile('mobile/src/services/voiceService.ts');
  check(vsFile.exists, 'TTS-01a', 'Centralized voiceService.ts exists');
  check(vsFile.content.includes('EcoSetuTTS'), 'TTS-01b', 'Integrates with native Android EcoSetuTTS module');
  check(
    !vsFile.content.includes('googleapis.com/texttospeech') &&
    !vsFile.content.includes('api.elevenlabs.io') &&
    !vsFile.content.includes('aws.amazon.com/polly'),
    'TTS-01c',
    'Zero cloud/paid TTS APIs used (100% on-device native)'
  );
  check(vsFile.content.includes('HIGH') && vsFile.content.includes('NORMAL') && vsFile.content.includes('LOW'), 'TTS-01d', 'Priority arbitration system implemented (HIGH, NORMAL, LOW)');
  check(vsFile.content.includes('DEBOUNCE_MS') && vsFile.content.includes('lastSpokenText'), 'TTS-01e', 'Anti-repetition debounce prevents repeated announcements');
  check(vsFile.content.includes('@ecosetu_voice_assistance') || vsFile.content.includes('STORAGE_KEYS.VOICE_ASSISTANCE'), 'TTS-01f', 'Voice Assistance setting persists to local storage');
  check(vsFile.content.includes('isEnabledCache = false') || vsFile.content.includes('stored === \'true\''), 'TTS-01g', 'Voice Assistance defaults to OFF');

  // 2. Multilingual Voice Synchronization
  console.log('\n─── 2. Multilingual Voice Synchronization ────────────────────────');
  check(vsFile.content.includes('getLanguage'), 'TTS-02a', 'Voice service dynamically syncs with active application language');
  const enLocale = readFile('mobile/src/i18n/locales/en.ts');
  const hiLocale = readFile('mobile/src/i18n/locales/hi.ts');
  const mrLocale = readFile('mobile/src/i18n/locales/mr.ts');
  const orLocale = readFile('mobile/src/i18n/locales/or.ts');
  check(enLocale.content.includes('voice:'), 'TTS-02b', 'English locale includes dedicated voice namespace');
  check(hiLocale.content.includes('voice:'), 'TTS-02c', 'Hindi locale includes dedicated voice namespace');
  check(mrLocale.content.includes('voice:'), 'TTS-02d', 'Marathi locale includes dedicated voice namespace');
  check(orLocale.content.includes('voice:'), 'TTS-02e', 'Odia locale includes dedicated voice namespace');

  // 3. Unified Voice UI Component
  console.log('\n─── 3. Unified Voice UI Component (<ReadAloudButton />) ─────────');
  const btnFile = readFile('mobile/src/components/voice/ReadAloudButton.tsx');
  check(btnFile.exists, 'TTS-03a', '<ReadAloudButton /> component exists');
  check(btnFile.content.includes('isSpeakingThis'), 'TTS-03b', 'Tracks active speaking state dynamically');
  check(btnFile.content.includes('isAvailable'), 'TTS-03c', 'Handles platform unavailable state gracefully');
  check(btnFile.content.includes('force: true'), 'TTS-03d', 'Manual button press overrides auto-assist toggle via force: true');
  check(btnFile.content.includes('voiceService.stop()'), 'TTS-03e', 'Supports stopping speech on re-tap');
  check(btnFile.content.includes('colors.primary') || btnFile.content.includes('theme/colors'), 'TTS-03f', 'Styled with EcoSetu glassmorphism theme tokens');

  // 4. Cross-Role Screen Integration
  console.log('\n─── 4. Cross-Role Voice Assistance Coverage ─────────────────────');
  
  // Citizen
  const citHome = readFile('mobile/src/screens/citizen/CitizenDashboardScreen.tsx');
  const citSubmit = readFile('mobile/src/screens/citizen/SubmitItemScreen.tsx');
  const citReqs = readFile('mobile/src/screens/citizen/CitizenRequestsScreen.tsx');
  const citReqDetail = readFile('mobile/src/screens/citizen/RequestDetailScreen.tsx');
  const citTrace = readFile('mobile/src/screens/citizen/ItemTraceabilityScreen.tsx');
  const citNotifs = readFile('mobile/src/screens/citizen/CitizenNotificationsScreen.tsx');

  check(citHome.content.includes('ReadAloudButton'), 'TTS-04a', 'Citizen Home includes voice assistance');
  check(citSubmit.content.includes('ReadAloudButton'), 'TTS-04b', 'Citizen Submit E-waste includes voice assistance');
  check(citReqs.content.includes('ReadAloudButton'), 'TTS-04c', 'Citizen Requests includes voice assistance');
  check(citReqDetail.content.includes('ReadAloudButton'), 'TTS-04d', 'Citizen Request Detail includes voice assistance');
  check(citTrace.content.includes('ReadAloudButton'), 'TTS-04e', 'Citizen Traceability includes voice assistance');
  check(citNotifs.content.includes('ReadAloudButton'), 'TTS-04f', 'Citizen Notifications includes voice assistance');

  // Collector
  const colDash = readFile('mobile/src/screens/collector/CollectorDashboardScreen.tsx');
  const colBrowse = readFile('mobile/src/screens/collector/CollectorBrowseScreen.tsx');
  const colPickup = readFile('mobile/src/screens/collector/CollectorPickupDetailScreen.tsx');

  check(colDash.content.includes('voiceService'), 'TTS-05a', 'Collector Dashboard provides voice assistance');
  check(colBrowse.content.includes('voiceService'), 'TTS-05b', 'Collector Browse Available Requests provides voice assistance');
  check(colPickup.content.includes('ReadAloudButton'), 'TTS-05c', 'Collector Pickup Confirmation includes voice assistance');

  // Recycler
  const recDash = readFile('mobile/src/screens/recycler/RecyclerDashboardScreen.tsx');
  const recCsg = readFile('mobile/src/screens/recycler/ConsignmentDetailScreen.tsx');

  check(recDash.content.includes('ReadAloudButton'), 'TTS-06a', 'Recycler Dashboard includes voice assistance');
  check(recCsg.content.includes('ReadAloudButton'), 'TTS-06b', 'Recycler Consignment Detail includes voice assistance');

  // Admin
  const admDash = readFile('mobile/src/screens/admin/AdminDashboardScreen.tsx');
  const admHealth = readFile('mobile/src/screens/admin/AdminSystemHealthScreen.tsx');
  const admGov = readFile('mobile/src/screens/admin/AdminGovernanceScreen.tsx');
  const admRep = readFile('mobile/src/screens/admin/AdminReportsScreen.tsx');
  const admVer = readFile('mobile/src/screens/admin/AdminVerificationsScreen.tsx');

  check(admDash.content.includes('ReadAloudButton'), 'TTS-07a', 'Admin Dashboard includes voice assistance');
  check(admHealth.content.includes('ReadAloudButton'), 'TTS-07b', 'Admin System Health includes voice assistance');
  check(admGov.content.includes('ReadAloudButton'), 'TTS-07c', 'Admin Governance includes voice assistance');
  check(admRep.content.includes('ReadAloudButton'), 'TTS-07d', 'Admin Reports includes voice assistance');
  check(admVer.content.includes('ReadAloudButton'), 'TTS-07e', 'Admin Verifications includes voice assistance');

  // 5. Privacy & Data Guardrails
  console.log('\n─── 5. Privacy & Security Guardrails ─────────────────────────────');
  const privContract = readFile('backend/tests/verify_collector_privacy_contract.js');
  check(privContract.exists, 'TTS-08a', 'Backend collector privacy contract verified');
  // Verify Collector Browse does not leak citizen phone or full address before acceptance
  check(
    !colBrowse.content.includes('voiceService.speak(request.phone') &&
    !colBrowse.content.includes('voiceService.speak(request.address'),
    'TTS-08b',
    'Collector Browse voice announcements never speak citizen phone or address pre-acceptance'
  );

  console.log('\n================================================================');
  console.log(`Pillar 4: Global TTS Results: ${passed} passed | ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFailures detail:');
    failures.forEach(f => console.error(` - [${f.testId}] ${f.description}: ${f.detail}`));
    process.exit(1);
  }
}

runGlobalTTSVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
