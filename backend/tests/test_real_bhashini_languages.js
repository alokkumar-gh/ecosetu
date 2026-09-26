/**
 * test_real_bhashini_languages.js
 * Real live multilingual BHASHINI TTS & ASR verification script.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = (process.env.BHASHINI_API_KEY || process.env.BHASHINI_INFERENCE_API_KEY || '').trim();
const userId = (process.env.BHASHINI_USER_ID || '').trim();
const udyatKey = (process.env.BHASHINI_UDYAT_KEY || process.env.BHASHINI_ULCA_API_KEY || '').trim();
const endpoint = process.env.BHASHINI_ENDPOINT || 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

const headers = {
  'Content-Type': 'application/json',
  Authorization: apiKey,
  Accept: '*/*',
};
if (userId) headers['userID'] = userId;
if (udyatKey) headers['ulcaApiKey'] = udyatKey;

async function testLanguage(name, langCode, sampleText) {
  console.log('----------------------------------------------------');
  console.log(`Testing ${name} (${langCode}): "${sampleText}"`);

  // 1. Real BHASHINI TTS
  const t0 = Date.now();
  const ttsRes = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: 'tts',
          config: {
            language: { sourceLanguage: langCode },
            gender: 'female',
          },
        },
      ],
      inputData: { input: [{ source: sampleText }] },
    }),
  });
  const ttsMs = Date.now() - t0;

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    console.error(`TTS FAILED: ${ttsRes.status} ${errText}`);
    return { name, langCode, tts: 'FAIL', ttsMs, asr: 'SKIPPED', transcript: '', match: false };
  }

  const ttsData = await ttsRes.json();
  const audioBase64 = ttsData.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
  console.log(`TTS SUCCESS in ${ttsMs}ms, audio base64 length: ${audioBase64 ? audioBase64.length : 0}`);

  // 2. Real BHASHINI ASR using the generated audio
  const t1 = Date.now();
  const asrRes = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: 'asr',
          config: {
            language: { sourceLanguage: langCode },
            audioFormat: 'wav',
          },
        },
      ],
      inputData: { audio: [{ audioContent: audioBase64 }] },
    }),
  });
  const asrMs = Date.now() - t1;

  if (!asrRes.ok) {
    const errText = await asrRes.text();
    console.error(`ASR FAILED: ${asrRes.status} ${errText}`);
    return { name, langCode, tts: 'PASS', ttsMs, asr: 'FAIL', asrMs, transcript: '', match: false };
  }

  const asrData = await asrRes.json();
  const transcript = asrData.pipelineResponse?.[0]?.output?.[0]?.source || '';
  console.log(`ASR SUCCESS in ${asrMs}ms!`);
  console.log(`Original:   "${sampleText}"`);
  console.log(`Transcript: "${transcript}"`);

  return {
    name,
    langCode,
    tts: 'PASS',
    ttsMs,
    asr: 'PASS',
    asrMs,
    transcript,
    exactMatch: transcript.trim() === sampleText.trim(),
  };
}

async function runAll() {
  const results = [];
  results.push(await testLanguage('Odia', 'or', 'ମୋ ପାଖରେ ପୁରୁଣା ମୋବାଇଲ୍ ଅଛି'));
  results.push(await testLanguage('Hindi', 'hi', 'मेरे पास पुराना मोबाइल है'));
  results.push(await testLanguage('English', 'en', 'Please schedule an e waste pickup'));
  results.push(await testLanguage('Bengali', 'bn', 'আমার কাছে পুরোনো মোবাইল আছে'));
  results.push(await testLanguage('Marathi', 'mr', 'माझ्याकडे जुना मोबाईल आहे'));

  console.log('\n====================================================');
  console.log('REAL BHASHINI MULTILINGUAL TTS + ASR RESULTS');
  console.log('====================================================');
  console.table(results);
}

runAll().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
