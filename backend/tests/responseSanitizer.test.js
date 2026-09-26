/**
 * EcoSetu — Central Groq & Assistant Response Sanitizer Test Suite
 * Comprehensive automated tests for UI display cleaning and TTS speech sanitization.
 */

const assert = require('assert');
const {
  sanitizeAssistantResponse,
  cleanTextForTTS,
  sanitizeTextForTTS,
} = require('../src/utils/responseSanitizer');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('====================================================');
console.log('ECOSETU — Groq Response Sanitizer Test Suite');
console.log('====================================================\n');

// ----------------------------------------------------
// SECTION 1: ASTERISK STRIPPING (QUADRUPLE, TRIPLE, DOUBLE, SINGLE)
// ----------------------------------------------------
console.log('--- 1. Asterisk Stripping ---');

runTest('Sanitizes quadruple asterisks: ****Hello**** -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('****Hello****'), 'Hello');
});

runTest('Sanitizes spaced quadruple asterisks: **** Hello **** -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('**** Hello ****'), 'Hello');
});

runTest('Sanitizes leading quadruple asterisks: ****Hello -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('****Hello'), 'Hello');
});

runTest('Sanitizes leading spaced quadruple asterisks: **** Hello -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('**** Hello'), 'Hello');
});

runTest('Sanitizes triple asterisks: ***Hello*** -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('***Hello***'), 'Hello');
});

runTest('Sanitizes double asterisks: **Hello** -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('**Hello**'), 'Hello');
});

runTest('Sanitizes single asterisks: *Hello* -> Hello', () => {
  assert.strictEqual(sanitizeAssistantResponse('*Hello*'), 'Hello');
});

runTest('Sanitizes formatted offers: ****Your offer is ₹500**** -> Your offer is ₹500', () => {
  assert.strictEqual(sanitizeAssistantResponse('****Your offer is ₹500****'), 'Your offer is ₹500');
});

// ----------------------------------------------------
// SECTION 2: MARKDOWN HEADINGS & BULLETS
// ----------------------------------------------------
console.log('\n--- 2. Headings, Bullets & Links ---');

runTest('Sanitizes markdown heading level 1: # Pickup Status -> Pickup Status', () => {
  assert.strictEqual(sanitizeAssistantResponse('# Pickup Status'), 'Pickup Status');
});

runTest('Sanitizes markdown heading level 2: ## Pickup Status -> Pickup Status', () => {
  assert.strictEqual(sanitizeAssistantResponse('## Pickup Status'), 'Pickup Status');
});

runTest('Sanitizes markdown heading level 3: ### Important -> Important', () => {
  assert.strictEqual(sanitizeAssistantResponse('### Important'), 'Important');
});

runTest('Sanitizes list bullets (- item, * item, + item)', () => {
  const input = '- Offer received\n- Pickup scheduled';
  const expected = 'Offer received\nPickup scheduled';
  assert.strictEqual(sanitizeAssistantResponse(input), expected);
});

runTest('Preserves hyphens inside compound words: e-waste and Eco-Saathi', () => {
  const input = 'We accept e-waste through the Eco-Saathi assistant.';
  assert.strictEqual(sanitizeAssistantResponse(input), input);
});

runTest('Sanitizes markdown links: [View pickup](https://example.com) -> View pickup', () => {
  const input = 'Please click [View pickup](https://example.com) to see your schedule.';
  const expected = 'Please click View pickup to see your schedule.';
  assert.strictEqual(sanitizeAssistantResponse(input), expected);
});

// ----------------------------------------------------
// SECTION 3: CODE MARKERS & JSON LEAKS
// ----------------------------------------------------
console.log('\n--- 3. Code Markers & JSON Leak Handling ---');

runTest('Removes inline backticks: `PICKUP_SCHEDULED` -> PICKUP_SCHEDULED', () => {
  assert.strictEqual(sanitizeAssistantResponse('Status is `PICKUP_SCHEDULED`.'), 'Status is PICKUP_SCHEDULED.');
});

runTest('Unwraps accidental JSON string: {"message": "**Your pickup is scheduled**"}', () => {
  const jsonInput = '{"message": "**Your pickup is scheduled**"}';
  assert.strictEqual(sanitizeAssistantResponse(jsonInput), 'Your pickup is scheduled');
});

runTest('Unwraps fenced code block: ```json {"text": "***Hello***"} ```', () => {
  const codeBlockInput = '```json\n{"text": "***Hello***"}\n```';
  assert.strictEqual(sanitizeAssistantResponse(codeBlockInput), 'Hello');
});

// ----------------------------------------------------
// SECTION 4: CONTENT & MULTILINGUAL PRESERVATION
// ----------------------------------------------------
console.log('\n--- 4. Content, Numerical & Multilingual Preservation ---');

runTest('Preserves Hindi text: ****आपका pickup कल है**** -> आपका pickup कल है', () => {
  assert.strictEqual(sanitizeAssistantResponse('****आपका pickup कल है****'), 'आपका pickup कल है');
});

runTest('Preserves Odia text: ****ଆପଣଙ୍କ pickup କାଲି ଅଛି**** -> ଆପଣଙ୍କ pickup କାଲି ଅଛି', () => {
  assert.strictEqual(sanitizeAssistantResponse('****ଆପଣଙ୍କ pickup କାଲି ଅଛି****'), 'ଆପଣଙ୍କ pickup କାଲି ଅଛି');
});

runTest('Preserves dates, times, currency, status enums and identifiers', () => {
  const input = '**Your pickup is scheduled for tomorrow at 10 AM with Collector-123. Estimated: ₹500. Status: PICKUP_SCHEDULED.**';
  const expected = 'Your pickup is scheduled for tomorrow at 10 AM with Collector-123. Estimated: ₹500. Status: PICKUP_SCHEDULED.';
  assert.strictEqual(sanitizeAssistantResponse(input), expected);
});

runTest('Preserves emojis in UI display text', () => {
  const input = '🔔 **Pickup Update:** Your driver is arriving soon! 🚚';
  const expected = '🔔 Pickup Update: Your driver is arriving soon! 🚚';
  assert.strictEqual(sanitizeAssistantResponse(input), expected);
});

// ----------------------------------------------------
// SECTION 5: MULTILINE RESPONSE CLEANING
// ----------------------------------------------------
console.log('\n--- 5. Multiline Response Cleaning ---');

runTest('Correctly formats multiline assistant messages', () => {
  const input = `****Pickup Update****

**Status:** Pickup Scheduled

- Collector: Rahul
- Date: Tomorrow
- Offer: ₹650`;

  const expected = `Pickup Update

Status: Pickup Scheduled

Collector: Rahul
Date: Tomorrow
Offer: ₹650`;

  assert.strictEqual(sanitizeAssistantResponse(input), expected);
});

// ----------------------------------------------------
// SECTION 6: TTS-SPECIFIC SANITIZATION
// ----------------------------------------------------
console.log('\n--- 6. TTS Speech Sanitization ---');

runTest('cleanTextForTTS: removes emojis for voice synthesis (🔔 **Pickup Update** -> Pickup Update)', () => {
  const input = '🔔 **Pickup Update**';
  assert.strictEqual(cleanTextForTTS(input), 'Pickup Update');
});

runTest('cleanTextForTTS: strips all markdown and formats for speech flow', () => {
  const input = `****Pickup Update****\n\n**Status:** Pickup Scheduled.\n- Collector: Rahul.\n- Offer: ₹650.`;
  const result = cleanTextForTTS(input);
  assert(!result.includes('*'));
  assert(!result.includes('#'));
  assert(!result.includes('- '));
  assert(result.includes('Pickup Update'));
  assert(result.includes('₹650'));
});

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
