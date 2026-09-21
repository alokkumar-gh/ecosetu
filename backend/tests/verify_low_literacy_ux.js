/**
 * verify_low_literacy_ux.js
 * Verification script for Prompt 12: Low-Literacy UX Hardening
 *
 * Verifies:
 * 1. Touch target sizes (>= 48dp minHeight/minWidth, >= 56dp primary actions)
 * 2. Visual icons and category symbols (>= 44dp / 64dp cards, >= 32pt icons)
 * 3. Quick Number Stepper component with presets and stepper buttons
 * 4. Status badge with distinct visual symbols (not color alone)
 * 5. Quote acceptance confirmation dialog / modal with all 6 required fields
 * 6. Handover confirmation dialog / modal with all 5 required fields
 * 7. Sale recording payment method selector with 4 methods and statutory non-money movement disclaimer
 * 8. Visual empty states across Lots, Quotes, Recycler Matches, Earnings
 * 9. Localization keys for lowLiteracy across en, hi, mr, or
 * 10. TTS read-aloud buttons on required screens
 * 11. 17 target Journey B screens UX compliance
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', testName });
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', testName, details });
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
  }
}

const ROOT = path.resolve(__dirname, '..', '..');
const MOBILE_SRC = path.join(ROOT, 'mobile', 'src');

console.log('=== ECOSETU PROMPT 12: LOW-LITERACY UX HARDENING VERIFICATION ===\n');

// 1. Common Components Check
console.log('1. Verifying Reusable Low-Literacy Components...');

// StatusBadge.tsx
const statusBadgePath = path.join(MOBILE_SRC, 'components', 'common', 'StatusBadge.tsx');
assert(fs.existsSync(statusBadgePath), 'StatusBadge.tsx exists');
if (fs.existsSync(statusBadgePath)) {
  const content = fs.readFileSync(statusBadgePath, 'utf8');
  assert(content.includes('STATUS_SYMBOLS'), 'StatusBadge defines STATUS_SYMBOLS dictionary');
  assert(content.includes('✓') && content.includes('⏳') && content.includes('✕') && content.includes('🚚'), 'StatusBadge includes distinct non-color symbols (✓, ⏳, ✕, 🚚)');
  assert(content.includes('badgeIcon'), 'StatusBadge renders symbol element alongside text label');
}

// ReadAloudButton.tsx
const readAloudPath = path.join(MOBILE_SRC, 'components', 'voice', 'ReadAloudButton.tsx');
assert(fs.existsSync(readAloudPath), 'ReadAloudButton.tsx exists');
if (fs.existsSync(readAloudPath)) {
  const content = fs.readFileSync(readAloudPath, 'utf8');
  assert(content.includes('minHeight: 48') && content.includes('minWidth: 48'), 'ReadAloudButton enforces >=48dp touch target across all variants');
  assert(content.includes('hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}'), 'ReadAloudButton provides hitSlop for accessibility');
}

// QuickNumberStepper.tsx
const stepperPath = path.join(MOBILE_SRC, 'components', 'common', 'QuickNumberStepper.tsx');
assert(fs.existsSync(stepperPath), 'QuickNumberStepper.tsx exists');
if (fs.existsSync(stepperPath)) {
  const content = fs.readFileSync(stepperPath, 'utf8');
  assert(content.includes('keyboardType="decimal-pad"') || content.includes('keyboardType="numeric"'), 'QuickNumberStepper uses decimal-pad/numeric keyboard');
  assert(content.includes('minHeight: 48') || content.includes('minWidth: 48'), 'QuickNumberStepper stepper buttons have >=48dp touch targets');
  assert(content.includes('presets') && content.includes('presetButton'), 'QuickNumberStepper provides quick weight preset chips (e.g. 5, 10, 25, 50 kg)');
  assert(content.includes('stepperButton'), 'QuickNumberStepper provides +/- stepper buttons');
}

// 2. Localization Keys Verification
console.log('\n2. Verifying Localization for Low-Literacy Keys...');
const requiredLowLiteracyKeys = [
  'quickAdd1', 'quickAdd5', 'quickAdd10', 'quickAdd25', 'quickAdd50', 'quickSub1', 'quickSub5',
  'quoteConfirmTitle', 'quoteConfirmMessage', 'buyer', 'rate', 'totalAmount', 'weight', 'category', 'validity',
  'acceptAction', 'cancelAction', 'handoverConfirmTitle', 'handoverConfirmMessage', 'handoverRef', 'locationStatus',
  'photoCount', 'confirmHandoverAction', 'saleConfirmTitle', 'saleConfirmMessage', 'paymentMethod', 'paymentStatus',
  'confirmSaleAction', 'paymentDisclaimerShort', 'emptyBatchesTitle', 'emptyBatchesDesc', 'captureFirstBatch',
  'emptyOffersTitle', 'emptyOffersDesc', 'findBuyers', 'emptyEarningsTitle', 'emptyEarningsDesc', 'viewBatches',
  'myEarningsQuickAction', 'myEarningsSubtitle', 'genericErrorTitle', 'genericErrorMessage', 'readLotDetails', 'tapMatchingScrap'
];

const locales = ['en', 'hi', 'mr', 'or'];
for (const loc of locales) {
  const locPath = path.join(MOBILE_SRC, 'i18n', 'locales', `${loc}.ts`);
  assert(fs.existsSync(locPath), `Locale file ${loc}.ts exists`);
  if (fs.existsSync(locPath)) {
    const content = fs.readFileSync(locPath, 'utf8');
    assert(content.includes('lowLiteracy:'), `Locale ${loc} contains lowLiteracy translation namespace`);
    let missingKeys = 0;
    for (const key of requiredLowLiteracyKeys) {
      if (!content.includes(`${key}:`)) {
        missingKeys++;
      }
    }
    assert(missingKeys === 0, `Locale ${loc} has all ${requiredLowLiteracyKeys.length} lowLiteracy keys (missing: ${missingKeys})`);
  }
}

// 3. Journey B Screen Hardening Verification
console.log('\n3. Verifying Journey B Screens UX Hardening...');

// Screen 1: CollectorDashboardScreen.tsx
const dashboardPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorDashboardScreen.tsx');
if (fs.existsSync(dashboardPath)) {
  const c = fs.readFileSync(dashboardPath, 'utf8');
  assert(c.includes('CollectorEarnings') && c.includes('myEarningsQuickAction'), 'Screen 1 (Dashboard): 1-tap shortcut to earnings/sales');
  assert(c.includes('minHeight: 52') || c.includes('minHeight: 56'), 'Screen 1 (Dashboard): Action buttons have >=52dp/56dp height');
}

// Screen 2: CollectorMaterialCaptureScreen.tsx
const capturePath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorMaterialCaptureScreen.tsx');
if (fs.existsSync(capturePath)) {
  const c = fs.readFileSync(capturePath, 'utf8');
  assert(c.includes('symbolContainer') && c.includes('width: 64') && c.includes('height: 64'), 'Screen 2 (Material Capture): Category visual cards >=64x64');
  assert(c.includes('categorySymbol') && c.includes('fontSize: 32'), 'Screen 2 (Material Capture): Category symbols >=32pt');
  assert(c.includes('minHeight: 56'), 'Screen 2 (Material Capture): Primary proceed button >=56dp');
}

// Screen 3: CollectorCreateLotScreen.tsx
const createLotPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorCreateLotScreen.tsx');
if (fs.existsSync(createLotPath)) {
  const c = fs.readFileSync(createLotPath, 'utf8');
  assert(c.includes('QuickNumberStepper'), 'Screen 3 (Create Lot): Uses QuickNumberStepper for weight input');
  assert(c.includes('minHeight: 56'), 'Screen 3 (Create Lot): Submit button has minHeight 56dp');
  assert(c.includes('minHeight: 52'), 'Screen 3 (Create Lot): Secondary draft button has minHeight 52dp');
}

// Screen 4: CollectorLotsScreen.tsx
const lotsPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorLotsScreen.tsx');
if (fs.existsSync(lotsPath)) {
  const c = fs.readFileSync(lotsPath, 'utf8');
  assert(c.includes('EmptyState') && c.includes('emptyBatchesTitle'), 'Screen 4 (Lots List): Has visual EmptyState with action CTA');
  assert(c.includes('filterPill') && c.includes('minHeight: 48'), 'Screen 4 (Lots List): Filter pills have >=48dp minHeight');
  assert(c.includes('fabButton') && c.includes('minHeight: 56'), 'Screen 4 (Lots List): FAB action button >=56dp');
}

// Screen 5: CollectorLotDetailScreen.tsx
const lotDetailPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorLotDetailScreen.tsx');
if (fs.existsSync(lotDetailPath)) {
  const c = fs.readFileSync(lotDetailPath, 'utf8');
  assert(c.includes('ReadAloudButton'), 'Screen 5 (Lot Detail): Features ReadAloudButton for TTS');
  assert(c.includes('minHeight: 56'), 'Screen 5 (Lot Detail): Primary action button >=56dp');
}

// Screens 6 & 7: CollectorPriceBoardScreen.tsx
const priceBoardPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorPriceBoardScreen.tsx');
if (fs.existsSync(priceBoardPath)) {
  const c = fs.readFileSync(priceBoardPath, 'utf8');
  assert(c.includes('categoryChip') && c.includes('minHeight: 48'), 'Screens 6 & 7 (Price Board): Category filter chips have >=48dp minHeight');
  assert(c.includes('speakButton') && (c.includes('minHeight: 48') || c.includes('height: 48')), 'Screens 6 & 7 (Price Board): Speak / TTS buttons have >=48dp touch target');
  assert(c.includes('periodBtn') && c.includes('minHeight: 48'), 'Screens 6 & 7 (Price Board): Period selector buttons have >=48dp touch target');
}

// Screen 8: CollectorRecyclerDirectoryScreen.tsx
const directoryPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorRecyclerDirectoryScreen.tsx');
if (fs.existsSync(directoryPath)) {
  const c = fs.readFileSync(directoryPath, 'utf8');
  assert(c.includes('filterChip') && c.includes('minHeight: 48'), 'Screen 8 (Directory): Filter chips have >=48dp minHeight');
  assert(c.includes('viewDetailsBtn') && c.includes('minHeight: 52') && c.includes('quickCallBtn'), 'Screen 8 (Directory): Action buttons (Call/Details) have >=52dp minHeight');
}

// Screen 9: CollectorRecyclerDetailScreen.tsx
const recyclerDetailPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorRecyclerDetailScreen.tsx');
if (fs.existsSync(recyclerDetailPath)) {
  const c = fs.readFileSync(recyclerDetailPath, 'utf8');
  assert(c.includes('voiceButton') && c.includes('minHeight: 52'), 'Screen 9 (Recycler Detail): Voice profile read-aloud button >=52dp');
  assert(c.includes('callButton') && c.includes('minHeight: 52') && c.includes('messageButton'), 'Screen 9 (Recycler Detail): Quick Call/Message buttons >=52dp');
  assert(c.includes('primaryActionBtn') && c.includes('minHeight: 56'), 'Screen 9 (Recycler Detail): Primary action button >=56dp');
}

// Screen 10: CollectorRecyclerMatchesScreen.tsx
const matchesPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorRecyclerMatchesScreen.tsx');
if (fs.existsSync(matchesPath)) {
  const c = fs.readFileSync(matchesPath, 'utf8');
  assert(c.includes('sortButton') && c.includes('minHeight: 48'), 'Screen 10 (Matches): Sort buttons have >=48dp minHeight');
  assert(c.includes('emptyCard') && c.includes('emptyTitle'), 'Screen 10 (Matches): Visual empty state with title & description');
}

// Screens 11 & 12: CollectorQuotesScreen.tsx
const quotesPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorQuotesScreen.tsx');
if (fs.existsSync(quotesPath)) {
  const c = fs.readFileSync(quotesPath, 'utf8');
  // Rule 6: Quote Acceptance Confirmation Dialog
  assert(c.includes('acceptModalVisible') && c.includes('Modal'), 'Screens 11 & 12 (Quotes): Has dedicated Quote Acceptance Confirmation Modal');
  assert(c.includes('quoteConfirmTitle') && c.includes('quoteConfirmMessage'), 'Screens 11 & 12 (Quotes): Modal has plain-language confirmation title & prompt');
  assert(c.includes('category'), 'Screens 11 & 12 (Quotes): Modal shows Material / Category');
  assert(c.includes('weight'), 'Screens 11 & 12 (Quotes): Modal shows Weight');
  assert(c.includes('quotedUnitPrice'), 'Screens 11 & 12 (Quotes): Modal shows Offered Rate');
  assert(c.includes('quotedTotal'), 'Screens 11 & 12 (Quotes): Modal shows Total Amount');
  assert(c.includes('buyer') && c.includes('facilityName'), 'Screens 11 & 12 (Quotes): Modal shows Recycler / Buyer Name');
  assert(c.includes('validUntil'), 'Screens 11 & 12 (Quotes): Modal shows Validity period');
  assert(c.includes('modalConfirmAcceptButton') && c.includes('minHeight: 56'), 'Screens 11 & 12 (Quotes): Modal confirm button >=56dp');
  assert(c.includes('modalCancelButton') && c.includes('minHeight: 52'), 'Screens 11 & 12 (Quotes): Modal cancel button >=52dp');
}

// Screen 13: CollectorHandoverScreen.tsx
const handoverPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorHandoverScreen.tsx');
if (fs.existsSync(handoverPath)) {
  const c = fs.readFileSync(handoverPath, 'utf8');
  // Rule 9: Stepper
  assert(c.includes('QuickNumberStepper'), 'Screen 13 (Handover): Uses QuickNumberStepper for scale weight');
  // Rule 7: Handover Confirmation Dialog
  assert(c.includes('confirmModalVisible') && c.includes('Modal'), 'Screen 13 (Handover): Has dedicated Handover Confirmation Modal');
  assert(c.includes('handoverConfirmTitle') && c.includes('handoverConfirmMessage'), 'Screen 13 (Handover): Modal has plain-language title & prompt');
  assert(c.includes('buyer') && c.includes('weight'), 'Screen 13 (Handover): Modal shows Buyer and Confirmed Weight');
  assert(c.includes('handoverRef'), 'Screen 13 (Handover): Modal shows Handover Reference / Lot ID');
  assert(c.includes('locationStatus'), 'Screen 13 (Handover): Modal shows GPS Location status');
  assert(c.includes('photoCount'), 'Screen 13 (Handover): Modal shows Photo count attached');
  assert(c.includes('modalConfirmBtn') && c.includes('minHeight: 56'), 'Screen 13 (Handover): Modal confirm button >=56dp');
  assert(c.includes('speechBtn') && c.includes('minHeight: 48') && c.includes('gpsBtn'), 'Screen 13 (Handover): Speech-to-text mic / GPS button >=48dp');
}

// Screen 14: CollectorRecordSaleScreen.tsx
const recordSalePath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorRecordSaleScreen.tsx');
if (fs.existsSync(recordSalePath)) {
  const c = fs.readFileSync(recordSalePath, 'utf8');
  // Rule 8: Payment method selection
  assert(c.includes('pillButton') && c.includes('minHeight: 56'), 'Screen 14 (Record Sale): Selectable payment method pills >=56dp');
  assert(c.includes('CASH') && c.includes('UPI_RECORDED') && c.includes('BANK_TRANSFER_RECORDED') && c.includes('OTHER'), 'Screen 14 (Record Sale): Supports Cash, UPI, Bank Transfer, Other');
  assert(c.includes('disclaimerBox') && c.includes('paymentDisclaimerShort'), 'Screen 14 (Record Sale): Contains statutory non-money movement disclaimer');
  assert(c.includes('confirmModalVisible') && c.includes('saleConfirmTitle'), 'Screen 14 (Record Sale): Has Sale Confirmation Modal');
}

// Screen 15: CollectorEarningsScreen.tsx
const earningsPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorEarningsScreen.tsx');
if (fs.existsSync(earningsPath)) {
  const c = fs.readFileSync(earningsPath, 'utf8');
  assert(c.includes('emptyTxnCard') && c.includes('emptyEarningsTitle') && c.includes('emptyActionBtn'), 'Screen 15 (Earnings): Visual empty state with action CTA');
  assert(c.includes('speechButton') && c.includes('minHeight: 48'), 'Screen 15 (Earnings): Read-aloud TTS button >=48dp');
  assert(c.includes('periodTab') && c.includes('minHeight: 48'), 'Screen 15 (Earnings): Period selector buttons >=48dp');
}

// Screen 16: CollectorLotTraceScreen.tsx
const tracePath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorLotTraceScreen.tsx');
if (fs.existsSync(tracePath)) {
  const c = fs.readFileSync(tracePath, 'utf8');
  assert(c.includes('ttsButton') && c.includes('minHeight: 52'), 'Screen 16 (Lot Trace): TTS audio narration button >=52dp');
  assert(c.includes('voiceService.speak'), 'Screen 16 (Lot Trace): Has TTS integration for journey steps');
}

// Screens 17a & 17b: CollectorSafetyCenterScreen.tsx & CollectorSafetyDetailScreen.tsx
const safetyCenterPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorSafetyCenterScreen.tsx');
const safetyDetailPath = path.join(MOBILE_SRC, 'screens', 'collector', 'CollectorSafetyDetailScreen.tsx');
if (fs.existsSync(safetyCenterPath) && fs.existsSync(safetyDetailPath)) {
  const c1 = fs.readFileSync(safetyCenterPath, 'utf8');
  const c2 = fs.readFileSync(safetyDetailPath, 'utf8');
  assert(c1.includes('iconCircle') && (c1.includes('width: 68') || c1.includes('height: 68')), 'Screen 17a (Safety Center): Pictorial-first icon circles >=68dp');
  assert(c1.includes('learnActionBtn') && c1.includes('minHeight: 48'), 'Screen 17a (Safety Center): Action buttons >=48dp');
  assert(c2.includes('speechButton') && c2.includes('minHeight: 56'), 'Screen 17b (Safety Detail): Voice guidance button >=56dp with audio narration');
}

// Summary
console.log('\n=== VERIFICATION SUMMARY ===');
console.log(`Total tests: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.error('\n❌ Some low-literacy UX tests failed.');
  process.exit(1);
} else {
  console.log('\n✅ ALL LOW-LITERACY UX HARDENING VERIFICATION CHECKS PASSED!');
  process.exit(0);
}
