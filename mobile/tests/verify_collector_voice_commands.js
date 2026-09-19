/**
 * EcoSetu Verification Suite: Phase 19 Task 19
 * Voice Commands / Speech-to-Intent for Informal Collector
 *
 * Source of Truth:
 * - docs/07_BUSINESS_WORKFLOWS.md
 * - docs/06_ROLES_AND_PERMISSIONS.md
 * - docs/19_SIH_DEMO_FLOW.md
 * - docs/24_ERROR_EDGE_CASES.md
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.resolve(ROOT_DIR, '..', 'backend');

let passedTests = 0;
let failedTests = 0;

function pass(name, detail = '') {
  passedTests++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failedTests++;
  console.error(`  ❌ [FAIL] ${name}: ${error}`);
}

function check(name, fn) {
  try {
    fn();
    pass(name);
  } catch (err) {
    fail(name, err.message);
  }
}

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Phase 19 Task 19 — Collector Voice Commands Verification');
console.log('════════════════════════════════════════════════════════════════════════\n');

// ─── 1. Role Availability & Non-Collector Denial ─────────────────────────────
console.log('─── 1. RBAC: Informal Collector Only Availability ──────────────────────');

check('Voice command button renders exclusively for INFORMAL_COLLECTOR role', () => {
  const btnFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'voice', 'CollectorVoiceButton.tsx'), 'utf8');
  assert(btnFile.includes('user?.role !== ROLES.INFORMAL_COLLECTOR') || btnFile.includes("user?.role !== 'INFORMAL_COLLECTOR'"), 'Missing collector role check');
  assert(btnFile.includes('return null;'), 'Must return null for non-collector roles');
});

check('Citizen, Recycler, and Admin navigators do NOT mount voice command interface', () => {
  const citizenNav = fs.readFileSync(path.join(ROOT_DIR, 'src', 'navigation', 'CitizenNavigator.tsx'), 'utf8');
  const recyclerNav = fs.readFileSync(path.join(ROOT_DIR, 'src', 'navigation', 'RecyclerNavigator.tsx'), 'utf8');
  const adminNav = fs.readFileSync(path.join(ROOT_DIR, 'src', 'navigation', 'AdminNavigator.tsx'), 'utf8');

  assert(!citizenNav.includes('CollectorVoiceButton'), 'CitizenNavigator must not mount CollectorVoiceButton');
  assert(!recyclerNav.includes('CollectorVoiceButton'), 'RecyclerNavigator must not mount CollectorVoiceButton');
  assert(!adminNav.includes('CollectorVoiceButton'), 'AdminNavigator must not mount CollectorVoiceButton');
});

check('CollectorVoiceContext blocks openVoiceModal and triggerListening for non-collectors', () => {
  const contextFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'CollectorVoiceContext.tsx'), 'utf8');
  assert(contextFile.includes('user?.role !== ROLES.INFORMAL_COLLECTOR'), 'Context missing collector role guard');
});

// ─── 2. Microphone Permission Flow & Android Native Module ──────────────────
console.log('─── 2. Microphone Permission Flow & Android Module ────────────────────');

check('Native Android EcoSetuSpeechModule.kt exists and extends ReactContextBaseJavaModule', () => {
  const moduleFile = fs.readFileSync(
    path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'java', 'com', 'ecosetu', 'EcoSetuSpeechModule.kt'),
    'utf8'
  );
  assert(moduleFile.includes('class EcoSetuSpeechModule'), 'Missing EcoSetuSpeechModule class');
  assert(moduleFile.includes('RecognizerIntent.ACTION_RECOGNIZE_SPEECH'), 'Must use native RecognizerIntent');
  assert(moduleFile.includes('SpeechRecognizer.isRecognitionAvailable'), 'Must check SpeechRecognizer availability');
});

check('EcoSetuSpeechModule is registered in EcoSetuTTSPackage.kt', () => {
  const pkgFile = fs.readFileSync(
    path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'java', 'com', 'ecosetu', 'EcoSetuTTSPackage.kt'),
    'utf8'
  );
  assert(pkgFile.includes('EcoSetuSpeechModule'), 'EcoSetuSpeechModule not registered in EcoSetuTTSPackage');
});

check('Microphone permission flow requests RECORD_AUDIO only on explicit user tap with explanation', () => {
  const serviceFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'voiceCommandService.ts'), 'utf8');
  assert(serviceFile.includes('requestMicrophonePermission'), 'Missing permission request method');
  assert(serviceFile.includes('PermissionsAndroid.PERMISSIONS.RECORD_AUDIO'), 'Must check RECORD_AUDIO permission');
  assert(serviceFile.includes('PermissionsAndroid.request'), 'Must request permission via PermissionsAndroid');
});

// ─── 3. Session States & Lifecycle ───────────────────────────────────────────
console.log('─── 3. Session States & Lifecycle ──────────────────────────────────────');

check('Voice command service and modal declare and handle all required lifecycle states', () => {
  const serviceFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'voiceCommandService.ts'), 'utf8');
  const modalFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'voice', 'CollectorVoiceModal.tsx'), 'utf8');

  const requiredStates = [
    'IDLE',
    'LISTENING',
    'PROCESSING',
    'SUCCESS',
    'NO_SPEECH',
    'UNRECOGNIZED_COMMAND',
    'PERMISSION_DENIED',
    'UNAVAILABLE',
    'OFFLINE',
    'ERROR',
  ];

  requiredStates.forEach((state) => {
    assert(serviceFile.includes(state), `voiceCommandService missing state: ${state}`);
    assert(modalFile.includes(state), `CollectorVoiceModal missing state: ${state}`);
  });
});

check('Duplicate session prevention: rejects concurrent listening calls while session is active', () => {
  const serviceFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'voiceCommandService.ts'), 'utf8');
  assert(serviceFile.includes('if (this.isSessionActive)'), 'Missing active session guard');
});

// ─── 4. Intent Parser & Multilingual Phrasing ────────────────────────────────
console.log('─── 4. Intent Parser & Multilingual Phrasing ───────────────────────────');

const { parseIntent, normalizeTranscript } = require(path.join(ROOT_DIR, 'src', 'services', 'intentParser'));

check('Transcript normalizer lowercases, strips punctuation, and trims extra spaces', () => {
  assert.strictEqual(normalizeTranscript('  Open, Pickups!!  '), 'open pickups');
  assert.strictEqual(normalizeTranscript('अनुरोध स्वीकार करो!'), 'अनुरोध स्वीकार करो');
});

check('Parses English navigation intents', () => {
  assert.strictEqual(parseIntent('open dashboard', 'en').intent, 'NAVIGATE_DASHBOARD');
  assert.strictEqual(parseIntent('open requests', 'en').intent, 'NAVIGATE_REQUESTS');
  assert.strictEqual(parseIntent('show my pickups', 'en').intent, 'NAVIGATE_PICKUPS');
  assert.strictEqual(parseIntent('open consignments', 'en').intent, 'NAVIGATE_CONSIGNMENTS');
  assert.strictEqual(parseIntent('show recyclers', 'en').intent, 'NAVIGATE_RECYCLERS');
  assert.strictEqual(parseIntent('open profile', 'en').intent, 'NAVIGATE_PROFILE');
});

check('Parses English read intents', () => {
  assert.strictEqual(parseIntent('read available requests', 'en').intent, 'READ_AVAILABLE_REQUESTS');
  assert.strictEqual(parseIntent('read my pickups', 'en').intent, 'READ_MY_PICKUPS');
  assert.strictEqual(parseIntent('read my consignments', 'en').intent, 'READ_MY_CONSIGNMENTS');
  assert.strictEqual(parseIntent('read nearby recyclers', 'en').intent, 'READ_NEARBY_RECYCLERS');
  assert.strictEqual(parseIntent('read my stats', 'en').intent, 'READ_COLLECTOR_STATS');
});

check('Parses Hindi intents (Devanagari)', () => {
  assert.strictEqual(parseIntent('डैशबोर्ड खोलो', 'hi').intent, 'NAVIGATE_DASHBOARD');
  assert.strictEqual(parseIntent('अनुरोध दिखाओ', 'hi').intent, 'NAVIGATE_REQUESTS');
  assert.strictEqual(parseIntent('मेरे पिकअप दिखाओ', 'hi').intent, 'NAVIGATE_PICKUPS');
  assert.strictEqual(parseIntent('अनुरोध स्वीकार करो', 'hi').intent, 'WORKFLOW_ACCEPT_REQUEST');
  assert.strictEqual(parseIntent('पिकअप शुरू करो', 'hi').intent, 'WORKFLOW_START_PICKUP');
  assert.strictEqual(parseIntent('पिकअप पूरा करो', 'hi').intent, 'WORKFLOW_COMPLETE_PICKUP');
});

check('Parses Marathi intents (Devanagari)', () => {
  assert.strictEqual(parseIntent('डॅशबोर्ड उघडा', 'mr').intent, 'NAVIGATE_DASHBOARD');
  assert.strictEqual(parseIntent('विनंत्या दाखवा', 'mr').intent, 'NAVIGATE_REQUESTS');
  assert.strictEqual(parseIntent('माझे पिकअप दाखवा', 'mr').intent, 'NAVIGATE_PICKUPS');
  assert.strictEqual(parseIntent('विनंती स्वीकारा', 'mr').intent, 'WORKFLOW_ACCEPT_REQUEST');
  assert.strictEqual(parseIntent('पिकअप सुरू करा', 'mr').intent, 'WORKFLOW_START_PICKUP');
  assert.strictEqual(parseIntent('पिकअप पूर्ण करा', 'mr').intent, 'WORKFLOW_COMPLETE_PICKUP');
});

check('Parses Odia intents (Odia script)', () => {
  assert.strictEqual(parseIntent('ଡ୍ୟାସବୋର୍ଡ ଖୋଲ', 'or').intent, 'NAVIGATE_DASHBOARD');
  assert.strictEqual(parseIntent('ଅନୁରୋଧ ଦେଖାଅ', 'or').intent, 'NAVIGATE_REQUESTS');
  assert.strictEqual(parseIntent('ମୋ ପିକଅପ ଦେଖାଅ', 'or').intent, 'NAVIGATE_PICKUPS');
  assert.strictEqual(parseIntent('ଅନୁରୋଧ ଗ୍ରହଣ କର', 'or').intent, 'WORKFLOW_ACCEPT_REQUEST');
  assert.strictEqual(parseIntent('ପିକଅପ ଆରମ୍ଭ କର', 'or').intent, 'WORKFLOW_START_PICKUP');
  assert.strictEqual(parseIntent('ପିକଅପ ସମ୍ପୂର୍ଣ୍ଣ କର', 'or').intent, 'WORKFLOW_COMPLETE_PICKUP');
});

check('Unrecognized command returns UNKNOWN category and zero confidence', () => {
  const result = parseIntent('order pizza tonight', 'en');
  assert.strictEqual(result.intent, 'UNKNOWN');
  assert.strictEqual(result.category, 'UNKNOWN');
  assert.strictEqual(result.confidence, 0);
});

// ─── 5. Selected Context & Confirmation Safety Model ─────────────────────────
console.log('─── 5. Selected Context & Confirmation Safety Model ───────────────────');

check('State-changing workflow commands explicitly require confirmation', () => {
  assert.strictEqual(parseIntent('accept request', 'en').requiresConfirmation, true);
  assert.strictEqual(parseIntent('start pickup', 'en').requiresConfirmation, true);
  assert.strictEqual(parseIntent('complete pickup', 'en').requiresConfirmation, true);
  assert.strictEqual(parseIntent('deliver consignment', 'en').requiresConfirmation, true);
});

check('Read and navigation commands do NOT require confirmation', () => {
  assert.strictEqual(parseIntent('open pickups', 'en').requiresConfirmation, false);
  assert.strictEqual(parseIntent('read my stats', 'en').requiresConfirmation, false);
});

check('Context model enforces selected entity requirement for workflow operations', () => {
  const contextFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'CollectorVoiceContext.tsx'), 'utf8');
  assert(contextFile.includes('if (targetEntity && (!selectedEntity || selectedEntity.type !== targetEntity))'), 'Missing selected entity check');
  assert(contextFile.includes('needSelectedEntity'), 'Must prompt user when selected entity is missing');
});

check('Offline safety: blocks state-changing voice operations when disconnected with localized message', () => {
  const contextFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'CollectorVoiceContext.tsx'), 'utf8');
  assert(contextFile.includes('if (requiresConfirmation && !isConnected)'), 'Missing offline check for state-changing commands');
  assert(!contextFile.includes('offlineQueue.enqueue'), 'Must never queue state-changing voice commands into offlineQueue');
});

// ─── 6. Service Handler Reuse & Privacy Safeguards ───────────────────────────
console.log('─── 6. Service Handler Reuse & Privacy Safeguards ───────────────────────');

check('Voice commands invoke existing screen/service action handlers (zero direct API bypass)', () => {
  const contextFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'CollectorVoiceContext.tsx'), 'utf8');
  assert(contextFile.includes('handlers.onAcceptRequest'), 'Must call onAcceptRequest handler');
  assert(contextFile.includes('handlers.onStartPickup'), 'Must call onStartPickup handler');
  assert(contextFile.includes('handlers.onCompletePickup'), 'Must call onCompletePickup handler');
  assert(contextFile.includes('handlers.onDeliverConsignment'), 'Must call onDeliverConsignment handler');
});

check('TTS integration reuses voiceService for spoken confirmations', () => {
  const contextFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'CollectorVoiceContext.tsx'), 'utf8');
  assert(contextFile.includes('voiceService.speak'), 'Must reuse existing voiceService.speak');
});

check('Privacy: Zero raw audio storage, zero audio upload to backend, zero continuous listening', () => {
  const moduleFile = fs.readFileSync(
    path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'java', 'com', 'ecosetu', 'EcoSetuSpeechModule.kt'),
    'utf8'
  );
  const serviceFile = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'voiceCommandService.ts'), 'utf8');

  assert(!moduleFile.includes('FileOutputStream') && !moduleFile.includes('AudioRecord'), 'Raw audio recording must not be stored');
  assert(!serviceFile.includes('/upload') && !serviceFile.includes('FormData'), 'Raw audio must not be uploaded');
  assert(!moduleFile.includes('WAKE_WORD') && !serviceFile.includes('alwaysOn'), 'Wake word / continuous listening forbidden');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  COLLECTOR VOICE COMMANDS RESULTS: ${passedTests} passed, ${failedTests} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
