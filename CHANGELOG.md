# Changelog

All notable changes to the **ECOSETU** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **BHASHINI Multilingual Voice Integration**: Integrated Government of India's BHASHINI (MeitY) Dhruva API infrastructure as the central voice and vernacular engine.
- **4-Language Indic Parity**: Full bidirectional voice and text support across **Odia (`or`)**, **Hindi (`hi`)**, **Marathi (`mr`)**, and **English (`en`)**.
- **Voice-First Collector Interaction (`VoiceInput.tsx`)**: Reusable voice input component featuring pre-permission explanation dialog, live listening indicator, recognized text preview, and explicit `✓ Use this` / `↻ Try again` verification actions.
- **Page Voice Guidance (`PageVoiceGuide.tsx`)**: Concise 2–3 sentence colloquial spoken audio guides mounted across Dashboard, Earnings, Price Board, Pickups, Material Lots, Handover, and Safety Center.
- **EcoSaathi Conversational Voice Assistant (`EcoSaathiChatModal.tsx`)**: Voice-enabled AI assistant with auto-speak preference toggle (`🔊 Voice: ON / OFF`) and inline per-bubble audio readout buttons.
- **First-Launch Language Onboarding (`LandingScreen.tsx`)**: Fullscreen native-script selection cards with instant audio welcome greetings and voice test controls.
- **Indic Coqui Phonetic Sanitization**: Dynamic audio preprocessing to prevent Indic TTS character spell-out stutter on abbreviation and punctuation marks.

### Improved
- **Language Onboarding & State Persistence**: Local AsyncStorage persistence (`@ecosetu_language`) ensuring 100% offline language retention across sessions.
- **Audio Lifecycle Management**: Automatic cleanup handlers (`voiceService.stop()`) on component unmount and screen transitions to eliminate background audio overlap.
- **Accessible UI & Touch Targets**: Standardized all primary interactive touch targets to $\ge 48\text{dp}$–$64\text{dp}$ with high-contrast institutional dark emerald styling.
- **Clean Vector Stroke Icons (`AppIcon.tsx`)**: Removed all AI sparkles, magic wands, and decorative emojis in favor of accessible vector primitives.
- **Error Normalization**: Replaced developer-oriented HTTP/pipeline errors with clear vernacular status guidance.

### Security
- **Backend-Only Credential Isolation**: BHASHINI inference keys (`BHASHINI_INFERENCE_API_KEY`, `BHASHINI_USER_ID`, `BHASHINI_UDYAT_KEY`) are kept strictly on the backend with zero frontend exposure.
- **Automatic Log Redaction**: Authorization headers and credentials are automatically stripped from server logs.
- **Deterministic Audio Caching**: SHA-256 hashed LRU cache preventing redundant API traffic and latency.

### Known Limitations
- **BHASHINI OCR Activation**: Optical Character Recognition (OCR) remains pending model/service activation on the registered BHASHINI account; route is safely isolated with explicit status reporting.
- **Physical Field Validation**: Automated integration, syntax, and live API pipeline verifications are completed; physical device-level and ground-level collector testing remain scheduled for field phases.

---

## [1.0.8] - 2026-09-20

### Added
- Admin Control Center (`AdminShell`) layout with 12 specialized operations screens.
- Digital Lot Handover verification and physical scale weight stepper.
- Offline SQLite queue and background synchronization for low-connectivity collection zones.
