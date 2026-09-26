/**
 * languages.js
 * Central supported languages configuration for ECOSETU Vernacular & Voice Engine (BHASHINI).
 */

const SUPPORTED_LANGUAGES = Object.freeze({
  auto: {
    code: 'auto',
    name: 'Auto Detect',
    nativeName: 'Auto Detect (ସ୍ୱତଃ / स्वचालित)',
    isAuto: true,
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
  },
  or: {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
  },
  as: {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Bengali-Assamese',
  },
});

// Alias normalizer mapping for various ISO / BCP-47 / legacy representations
const LANGUAGE_ALIASES = Object.freeze({
  od: 'or',
  ori: 'or',
  'or-in': 'or',
  'ori-in': 'or',
  hin: 'hi',
  'hi-in': 'hi',
  eng: 'en',
  'en-in': 'en',
  'en-us': 'en',
  mar: 'mr',
  'mr-in': 'mr',
  ben: 'bn',
  'bn-in': 'bn',
  tel: 'te',
  'te-in': 'te',
  tam: 'ta',
  'ta-in': 'ta',
  kan: 'kn',
  'kn-in': 'kn',
  mal: 'ml',
  'ml-in': 'ml',
  guj: 'gu',
  'gu-in': 'gu',
  pan: 'pa',
  'pa-in': 'pa',
  asm: 'as',
  'as-in': 'as',
  mai: 'hi',
  bho: 'hi',
  mag: 'hi',
  hne: 'hi',
});

/**
 * Normalizes any language code or alias to canonical BHASHINI language code.
 * @param {string} lang - Language code or string (e.g. 'od', 'hi-IN', 'or')
 * @returns {string} Canonical language code (e.g. 'or', 'hi', 'en')
 */
function normalizeLanguage(lang) {
  if (!lang) return 'en';
  const clean = String(lang).toLowerCase().trim();
  if (clean === 'auto' || clean === 'all') return 'auto';
  if (SUPPORTED_LANGUAGES[clean]) return clean;
  if (LANGUAGE_ALIASES[clean]) return LANGUAGE_ALIASES[clean];
  const primaryTag = clean.split('-')[0].split('_')[0];
  if (SUPPORTED_LANGUAGES[primaryTag]) return primaryTag;
  if (LANGUAGE_ALIASES[primaryTag]) return LANGUAGE_ALIASES[primaryTag];
  return 'en';
}

/**
 * Returns descriptive metadata for a language code.
 * @param {string} lang 
 * @returns {{ code: string, name: string, nativeName: string }}
 */
function getLanguageInfo(lang) {
  const norm = normalizeLanguage(lang);
  return SUPPORTED_LANGUAGES[norm] || {
    code: norm,
    name: norm.toUpperCase(),
    nativeName: norm.toUpperCase(),
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  LANGUAGE_ALIASES,
  normalizeLanguage,
  getLanguageInfo,
};
