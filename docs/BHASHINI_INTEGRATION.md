# ECOSETU Vernacular & Voice Engine (BHASHINI Integration Specification)

**Document Status**: Official Production Specification  
**Authority**: Centralized Vernacular & Voice Architecture for ECOSETU  
**Ecosystem**: BHASHINI (National Language Translation Mission, MeitY, Government of India)  
**Primary Target Users**: Informal E-Waste Collectors (Kabadiwalas), Non-English-Speaking Operators, Low-Literacy Users  
**Supported Languages**: Odia (`or`), Hindi (`hi`), Marathi (`mr`), English (`en`)

---

## 1. Executive Summary & Objective

ECOSETU integrates the official Government of India **BHASHINI** API infrastructure as a centralized **Vernacular & Voice Engine**.

Rather than acting as a simple translation layer or decorative TTS button, the engine enables end-to-end voice-driven application usage for informal collectors across India. Collectors can discover fair market prices per kilogram, record scrap collections, execute digital handovers with weight verification, inspect pictorial safety guides, and converse with **EcoSaathi** (AI Assistant) entirely through spoken voice in their native tongue.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ECOSETU Mobile Application                        │
│   (VoiceInput · PageVoiceGuide · EcoSaathi Voice Chat · Multi-Locale UI) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Internal REST: /api/v1/voice/*)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ECOSETU Backend Engine                          │
│   (Auth · In-Memory Caching · Rate-Limiting · Indic Phonetic Normalizer)│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Server-Side HTTPS Bearer Auth)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BHASHINI Dhruva Pipeline API                       │
│          https://dhruva-api.bhashini.gov.in/services/inference          │
├───────────────────────┬─────────────────────────┬───────────────────────┤
│     BHASHINI TTS      │      BHASHINI ASR       │     BHASHINI TLD      │
│  Text-to-Speech (4L)  │  Speech-to-Text (4L)    │  Language Detection   │
├───────────────────────┼─────────────────────────┼───────────────────────┤
│     BHASHINI NMT      │    Simple Language      │     BHASHINI OCR      │
│  Translation Engine   │    Vernacular Layer     │ (Pending Activation)  │
└───────────────────────┴─────────────────────────┴───────────────────────┘
```

---

## 3. Supported Languages & Service Capabilities Matrix

| Language | ISO Code | Native Script | ASR (Speech-to-Text) | TTS (Text-to-Speech) | TLD (Detection) | NMT (Translation) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Odia** | `or` (`od`) | ଓଡ଼ିଆ | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** |
| **Hindi** | `hi` | हिन्दी | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** |
| **Marathi** | `mr` | मराठी | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** |
| **English** | `en` | English | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** | **LIVE / PASS** |

### Optical Character Recognition (OCR) Status
> [!WARNING]
> **CURRENT STATUS**: OCR is currently **BLOCKED** because the required BHASHINI OCR model/service is not activated for the registered ECOSETU account. The OCR route (`POST /api/v1/ocr`) remains strictly isolated, returns explicit status reporting, and does not interfere with voice/vernacular functionality.

---

## 4. Strict Security & Credential Isolation Model

1. **Zero Client-Side Exposure**: `BHASHINI_INFERENCE_API_KEY`, `BHASHINI_USER_ID`, and `BHASHINI_UDYAT_KEY` are never bundled into mobile code, client JavaScript, APKs, or frontend assets.
2. **Server-Authoritative Gateway**: All BHASHINI inference requests are routed through the backend proxy controller (`/api/v1/voice/*`).
3. **Environment Isolation**: Secrets are loaded from server environment variables only and strictly excluded via `.gitignore`.
4. **Credential Redaction**: Server logs automatically redact all authorization headers, bearer tokens, and API keys.

---

## 5. Backend REST API Specifications

### 5.1 Text-to-Speech (TTS)
- **Route**: `POST /api/v1/voice/tts`
- **Request Body**:
  ```json
  {
    "text": "ଇକୋସେତୁ ଡ୍ୟାସବୋର୍ଡ କୁ ସ୍ୱାଗତ।",
    "language": "or",
    "gender": "female",
    "audioFormat": "wav",
    "samplingRate": 16000,
    "bypassCache": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "audioBase64": "UklGRiQAAABXQVZF...",
      "audioFormat": "wav",
      "language": "or",
      "isCached": true,
      "latencyMs": 24
    }
  }
  ```

### 5.2 Automatic Speech Recognition (ASR)
- **Route**: `POST /api/v1/voice/asr`
- **Request Body**:
  ```json
  {
    "audioBase64": "UklGRiQAAABXQVZF...",
    "language": "mr",
    "audioFormat": "wav",
    "samplingRate": 16000
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "text": "माझ्याकडे जुना मोबाईल आहे",
      "language": "mr",
      "confidence": 0.98,
      "latencyMs": 310
    }
  }
  ```

### 5.3 Text Language Detection (TLD)
- **Route**: `POST /api/v1/language/detect`
- **Request Body**:
  ```json
  {
    "text": "हे तुमचे इकोसेतू डॅशबोर्ड आहे"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "language": "mr",
      "confidence": 0.99,
      "latencyMs": 2
    }
  }
  ```

### 5.4 Neural Machine Translation (NMT)
- **Route**: `POST /api/v1/language/translate`
- **Request Body**:
  ```json
  {
    "text": "Current market rate for copper cable",
    "sourceLanguage": "en",
    "targetLanguage": "mr"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "translatedText": "तांब्याच्या केबलसाठी सध्याचा बाजारभाव",
      "sourceLanguage": "en",
      "targetLanguage": "mr",
      "latencyMs": 180
    }
  }
  ```

### 5.5 Engine Diagnostics & Health
- **Route**: `GET /api/v1/voice/status`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "service": "ECOSETU Vernacular & Voice Engine (BHASHINI)",
      "status": "READY",
      "configured": true,
      "hasUserId": true,
      "endpoint": "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
      "supportedLanguages": ["or", "od", "hi", "en", "mr"],
      "capabilities": {
        "tts": true,
        "asr": true,
        "tld": true,
        "ocr": false,
        "translation": true
      },
      "cachedTtsEntries": 48,
      "version": "1.0.0"
    }
  }
  ```

---

## 6. TTS Caching & Indic Phonetic Sanitization

1. **Deterministic SHA-256 Cache Key**: `SHA-256(text + language + gender + audioFormat)`.
2. **In-Memory LRU Cache**: Stores up to 500 active audio buffers with 24-hour TTL, serving static voice guides in $<2\text{ms}$.
3. **Indic Coqui Phonetic Rules**:
   - Strips markdown symbols (`*`, `#`, `` ` ``) and emojis before Dhruva dispatch.
   - Replaces ASCII period dots (`.`) with space/pauses in Indic scripts to prevent TTS engine character spell-out stutter.

---

## 7. Collector Voice UX & Component Architecture

```
Speech Input (Odia / Hindi / Marathi / English)
   │
   ▼
VoiceInput.tsx (Pre-Permission Modal ──> Listening ──> "You said..." ──> ✓ Use / ↻ Retry)
   │
   ▼
EcoSaathi Chat Context (NMT Translation & Intent Matching)
   │
   ▼
Response Synthesis (BHASHINI TTS with Auto-Speak Toggle / Per-Bubble Listen)
   │
   ▼
PageVoiceGuide.tsx (Concise 2–3 sentence colloquial audio explanation)
```

1. **First-Launch Onboarding (`LandingScreen.tsx`)**: Fullscreen native script cards with immediate audio greeting and spoken speech test.
2. **Contextual Permission UX**: Vernacular pre-permission prompt explaining why mic access is needed before Android system dialog.
3. **EcoSaathi Assistant**: Clean human-friendly status messages (*"Listening..."*, *"Understanding..."*, *"Preparing answer..."*) with auto-speak preference toggle.
4. **Audio Lifecycle Guard**: Components automatically invoke `voiceService.stop()` upon navigation or unmount to guarantee single-stream playback without background audio bleed.

---

## 8. Graceful Fallback & Offline Resilience

If network connectivity is degraded or BHASHINI services encounter temporary latency:
1. The app gracefully falls back to native on-device Android TextToSpeech (`EcoSetuTTS`).
2. The UI switches to keyboard mode without crashing or displaying cryptic HTTP 500 stack traces.
3. All core business operations (Lots, Handover, Price Board, Earnings) remain fully operable offline.

---

## 9. Verification Summary

- Automated BHASHINI Architecture: `8/8 checks passed` (`verify_bhashini_integration.js`)
- Automated Vernacular & Persistence: `23/23 checks passed` (`verify_vernacular_language.js`)
- Live Pipeline Verification: Verified against live BHASHINI Dhruva infrastructure across Odia, Hindi, Marathi, and English.
