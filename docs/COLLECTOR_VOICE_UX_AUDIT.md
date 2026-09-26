# ECOSETU — Collector-First Vernacular Voice UX & Usability Audit Report

**Audit Type**: Software Usability & Accessibility Audit (Heuristic & Codebase Verification)  
**Date**: September 26, 2026  
**Audience**: Informal E-Waste Collectors (Kabadiwalas, Itinerant Waste Buyers), Low-Literacy & Vernacular-First Operators  
**Supported Languages**: Odia (`or` / `ଓଡ଼ିଆ`), Hindi (`hi` / `हिन्दी`), Marathi (`mr` / `मराठी`), English (`en`)  
**Voice Engine**: BHASHINI Live Unified Indic Engine (TTS, ASR, NMT, TLD)  
**Verification Status**:  
- TypeScript: `PASS` (`0 errors`)  
- Vernacular Language & Persistence: `PASS` (`23/23 tests`)  
- BHASHINI Integration Architecture: `PASS` (`8/8 tests`)  
- Indic Pipeline Parity: `PASS` (Odia, Hindi, Marathi, English)

---

## 1. Executive Summary & Collector Persona Context

The informal e-waste collection sector in India operates primarily through non-English-speaking, low-to-moderate literacy operators using budget or mid-range Android smartphones. Technical terminology (such as *Extended Producer Responsibility*, *Reverse Logistics*, *API pipeline*, *NMT Translation*) creates an insurmountable barrier to adoption.

This UX pass transforms ECOSETU from a compliance tool into an intuitive, voice-first companion where collectors navigate, evaluate scrap prices, receive pickup assignments, and conduct verifiable transactions through **spoken voice, simple colloquial language, and high-contrast visual cues**.

> [!IMPORTANT]
> **Methodology Notice**: This document details a comprehensive **Software UX & Accessibility Audit**. In accordance with SIH-LANG-008, no fabricated field claims are made; live physical field testing with human informal collectors remains scheduled as a separate ground validation phase.

---

## 2. End-to-End Collector Journey Audit

| Journey Stage | Primary User Need | Vernacular Voice & Visual Solution | Status |
| :--- | :--- | :--- | :--- |
| **1. App Launch & Onboarding** | Choose language immediately without reading complex instructions. | Clean fullscreen modal with 4 native script cards (`ଓଡ଼ିଆ`, `हिन्दी`, `मराठी`, `English`), minHeight 64dp. Immediate voice greeting with `🔊 Listen` and `🎙️ Try speaking`. | `PASS` |
| **2. Permission UX** | Understand *why* the app asks for microphone access. | Contextual pre-permission card in native tongue explaining: *"You can speak to ECOSETU directly instead of typing."* Non-blocking keyboard fallback on decline. | `PASS` |
| **3. Dashboard** | Instantly know today's earnings, pickups, and actions. | High-contrast KPI cards with top `PageVoiceGuide` (2-3 colloquial sentences explaining the screen) and 1-tap `EcoSaathi` voice button. | `PASS` |
| **4. E-Waste Identification** | Identify item scrap category and market rate without typing. | Voice input with camera capture. User can tap mic, say item name in Odia/Hindi/Marathi, and see detected material. | `PASS` |
| **5. Pickup & Navigation** | Find who has scrap to collect nearby and navigation instructions. | Pickup list with `PageVoiceGuide` explaining customer requests, clear status chips (`SCHEDULED`, `IN_PROGRESS`), and voice readout. | `PASS` |
| **6. Price Discovery** | Check fair market benchmark rates per kilogram. | `CollectorPriceBoard` with segmented tabs, `PageVoiceGuide`, and individual `🔊 Listen` rate readouts per material (Battery, PCB, Mobile, CRT). | `PASS` |
| **7. Material Lots & Offers** | Review aggregated scrap lots and authorized recycler bids. | `CollectorLots` with `PageVoiceGuide` explaining lots, offer count badges, and transparent quote comparison. | `PASS` |
| **8. Digital Handover & Weight** | Ensure accurate weight and transparent payment transfer. | `CollectorHandover` with digital scale weight stepper, variance calculation, offline support, and `🔊 Listen` receipt readout. | `PASS` |
| **9. Safety Center** | Learn hazardous handling procedures (batteries, CRT glass, acid). | Pictorial hazard cards with audio overview banner and topic-specific spoken guidelines. | `PASS` |
| **10. EcoSaathi Voice Chat** | Ask any question naturally by speaking in local tongue. | Conversational voice modal with clean state machine, human-friendly messages, auto-speak toggle, and per-bubble audio replay. | `PASS` |

---

## 3. Language Onboarding Architecture (Phase 2)

### Design Implementation (`LandingScreen.tsx`)
- **Native Scripts Only**: Zero national flags, zero decorative emojis, zero AI sparkles.
- **Touch Targets**: Cards sized at `minHeight: 64dp` with `20px` bold native typography.
- **Interactive Voice Onboarding**:
  - Immediately after language selection, a greeting card appears.
  - Collector can tap **"🔊 Listen"** to hear:
    - *Odia*: `"ଇକୋସେତୁକୁ ସ୍ୱାଗତ। ଆପଣ ନିଜ ଭାଷାରେ କଥା ହୋଇ ସବୁ ସୂଚନା ଶୁଣିପାରିବେ।"`
    - *Hindi*: `"इकोसेतु में आपका स्वागत है। आप अपनी भाषा में बोलकर जानकारी सुन सकते हैं।"`
    - *Marathi*: `"इकोसेतू मध्ये आपले स्वागत आहे. आपण आपल्या भाषेत माहिती ऐकू शकता."`
    - *English*: `"Welcome to EcoSetu. You can use your voice to ask questions and listen to information."`
  - Collector can tap **"🎙️ Try speaking"** to test speech recognition immediately before entering the app.

---

## 4. Pre-Permission UX & Graceful Degradation (Phase 3)

### Permission Explanation Modal (`VoiceInput.tsx` & `EcoSaathiChatModal.tsx`)
Rather than triggering an abrupt Android system prompt, ECOSETU presents an explanatory vernacular modal:
- **Title**: *Microphone Permission* / *ମାଇକ୍ରୋଫୋନ୍ ବ୍ୟବହାର* / *माइक्रोफ़ोन का उपयोग* / *मायक्रोफोनचा वापर*
- **Explanation**: *"You can speak to ECOSETU directly instead of typing."*
- **Primary Action (>= 48dp)**: `"Allow Access"` / `"ଅନୁମତି ଦିଅନ୍ତୁ"` / `"अनुमति दें"` / `"परवानगी द्या"`
- **Secondary Action (Non-blocking)**: `"Use Keyboard"` / `"ଟାଇପ୍ କରିବି"` / `"टाइप करूँगा"` / `"टाइप करेन"`

If permission is denied:
- The app does not crash or block navigation.
- A friendly toast notifies the collector they can continue using the keyboard.

---

## 5. VoiceInput State Machine & Recognition Verification (Phase 5)

To prevent misrecognition from submitting incorrect data on low-connectivity or noisy scrap yards, `VoiceInput.tsx` enforces an explicit 5-stage state machine:

```
┌─────────┐     Tap Mic     ┌──────────────────┐    Audio Detected    ┌────────────┐
│  READY  │ ──────────────> │    RECORDING     │ ───────────────────> │ PROCESSING │
└─────────┘                 │ ("Listening...") │                      └────────────┘
     ▲                      └──────────────────┘                            │
     │                                                                      ▼
     │  "↻ Try again"                                              ┌─────────────────┐
     └──────────────────────────────────────────────────────────── │   RECOGNIZED    │
                                                                   │ ("You said...") │
                                                                   └─────────────────┘
                                                                            │
                                                       "✓ Use this"         ▼
                                                                   ┌─────────────────┐
                                                                   │ onRecognized()  │
                                                                   └─────────────────┘
```

1. **`READY`**: Prominent emerald button (minHeight: 56dp) with clear mic icon and "Tap to speak" label.
2. **`RECORDING`**: Pulsing red indicator with "Listening... Speak clearly now" in local language.
3. **`PROCESSING`**: High-contrast spinner with "Understanding your voice...".
4. **`RECOGNIZED`**: Displays *"You said: <recognized_text>"* and provides two clear buttons:
   - **`✓ Use this`** (Primary green, 48dp): Confirms and submits the text.
   - **`↻ Try again`** (Secondary slate, 48dp): Clears recognized text and resets state to `READY`.

---

## 6. EcoSaathi Voice Chat UX & Auto-Speak Setting (Phases 6 & 7)

### Human-Friendly State Transitions
All internal technical processing details have been removed:
- Replaced `"Calling BHASHINI ASR..."` with `"Listening..."` / `"ଶୁଣୁଛି..."` / `"सुन रहा हूँ..."` / `"ऐकत आहे..."`
- Replaced `"Running NMT translation pipeline..."` with `"Understanding..."` / `"ବୁଝୁଛି..."` / `"समझ रहा हूँ..."` / `"समजून घेत आहे..."`
- Replaced `"Processing intent / TTS synthesis..."` with `"Preparing answer..."` / `"ଉତ୍ତର ପ୍ରସ୍ତୁତ ହେଉଛି..."` / `"उत्तर तैयार हो रहा है..."` / `"उत्तर तयार होत आहे..."`

### Auto-Speak Preference Controls
- **Header Toggle**: Collector can switch **"Voice responses: ON / OFF"** (`🔊 Voice: ON` / `Voice: OFF`).
- **When Voice is ON**: Saathi responses automatically play Indic TTS audio upon arrival.
- **When Voice is OFF**: Responses arrive silently, with an inline **"🔊 Listen" / "🔊 ଶୁଣନ୍ତୁ" / "🔊 सुनें" / "🔊 ऐका"** button on each message bubble for manual on-demand readout.

---

## 7. Standardized Page Voice Guides (Phase 8)

`PageVoiceGuide.tsx` is mounted across core collector operational screens. Explanations are strictly conversational and limited to 2–3 sentences:

| Screen | Page Key | Vernacular Explanation Summary |
| :--- | :--- | :--- |
| **Dashboard** | `CollectorDashboard` | Explains total earnings, collected materials, and active requests. |
| **Earnings** | `CollectorEarnings` | Explains settled payments, pending balances, and transparent sales records. |
| **Price Board** | `CollectorPriceBoard` | Explains today's benchmark market rates per kg for mobile, laptops, batteries, and PCBs. |
| **Pickups** | `CollectorPickups` | Explains incoming citizen e-waste collection requests, addresses, and timing. |
| **Material Lots** | `CollectorLots` | Explains aggregated scrap lots ready to be quoted and sold to authorized recyclers. |
| **Handover** | `CollectorHandover` | Explains digital scale weight verification and secure transaction receipts. |
| **Safety Center** | `CollectorSafetyCenter` | Explains safe handling of swollen lithium batteries, CRT glass, and protective gear. |

---

## 8. Simple Language Transformation Matrix (Phase 10)

| Technical Compliance Concept | Colloquial Meaning | Vernacular Translation (Odia / Hindi / Marathi) |
| :--- | :--- | :--- |
| **Extended Producer Responsibility (EPR)** | Government e-waste recycling rule | ସରକାରୀ ଇ-ୱେଷ୍ଟ ନିୟମ / सरकारी रीसाइक्लिंग नियम / सरकारी पुनर्वापर नियम |
| **Authorized Recycler** | Government-approved factory | ସରକାରୀ ଅନୁମୋଦିତ ରିସାଇକ୍ଲର / अधिकृत रीसायकलिंग फैक्ट्री / अधिकृत पुनर्वापर केंद्र |
| **Digital Handover Verification** | Weight matching & digital receipt | ଓଜନ ଯାଞ୍ଚ ଓ ଡିଜିଟାଲ୍ ରସିଦ / वजन जांच और पक्की रसीद / वजन पडताळणी आणि पावती |
| **Settled Transaction** | Money sent to bank/UPI | ଖାତାକୁ ଟଙ୍କା ଜମା ହେଲା / खाते में पैसा आ गया / खात्यात पैसे जमा झाले |
| **Material Lot Aggregation** | Scrap goods collected | ଏକାଠି କରାଯାଇଥିବା ମାଲ୍ / इकट्ठा किया गया सामान / गोळा केलेले साहित्य |
| **Hazardous CRT Glass** | Old TV picture tube glass | ପୁରୁଣା ଟିଭି କାଚ / पुराने टीवी का कांच / जुन्या टीव्हीची काच |

---

## 9. Audio Lifecycle & Single-Stream Management (Phase 11)

To prevent audio overlap, memory leaks, or continuing background playback:
1. **Single Audio Instance**: `voiceService.speak()` automatically invokes `voiceService.stop()` on existing audio streams before playing new content.
2. **Component Unmount Teardown**: `useEffect` cleanup handlers in `LandingScreen`, `PageVoiceGuide`, `VoiceInput`, and `EcoSaathiChatModal` trigger `voiceService.stop()` immediately when the collector navigates away or closes a modal.
3. **Paging Delay & Sanitization**: Markdown asterisks (`*`), hashtags (`#`), backticks, and emojis are stripped prior to TTS synthesis to prevent Indic TTS engine pronunciation stutter.

---

## 10. Accessibility & Small-Screen Optimization (Phase 13 & 14)

1. **Touch Target Sizing**:
   - All primary CTA buttons: `minHeight: 48dp` to `64dp`.
   - Voice microphone buttons: `48dp` width/height with minimum `48dp` clickable bounds.
   - Segmented tabs and chips: `minHeight: 42dp`.
2. **Visual Hierarchy & Contrast**:
   - Backgrounds: Solid institutional dark slate (`#02080D`, `#071E22`).
   - Text: High-contrast white (`#FFFFFF`) and emerald mint (`#6EE7B7`).
   - Zero low-contrast gray-on-gray text.
3. **AI Gimmick Removal**:
   - Replaced all AI sparkles, generic magic wands, and neon badges with clean vector stroke icons (`volume`, `mic`, `eco`, `shieldCheck`, `package`, `check`).
   - Standardized layout spacing and padding for Android safe areas and navigation bars.

---

## 11. Verification Test Results (Phase 17)

```bash
> npm run typecheck
tsc --noEmit
# Result: 0 errors (PASS)

> node backend/tests/verify_vernacular_language.js
# Result: 23/23 tests PASSED (PASS)

> node backend/tests/verify_bhashini_integration.js
# Result: 8/8 tests PASSED (PASS)
```

---

## 12. Remaining Usability Observations & Future Roadmap

1. **Physical Field Testing**: Real-world field testing with ground-level informal collectors across rural/semi-urban clusters in Odisha, Maharashtra, and Uttar Pradesh remains scheduled for physical device validation.
2. **Noisy Background ASR Filtering**: Scrap yards often have ambient machinery noise; implementing local noise gate algorithms before streaming base64 audio to BHASHINI ASR will further enhance recognition fidelity in future releases.
3. **Offline Voice Guide Cache Preloading**: Pre-caching key page voice guide MP3/WAV assets during initial app download will ensure instant audio playback even in complete network dead zones.
