/**
 * EcoSetu — TTS Markdown & Speech Text Sanitizer (Re-export / Compatibility Layer)
 * Canonical Implementation: src/utils/responseSanitizer.js
 */

const {
  cleanTextForTTS,
  sanitizeAssistantResponse,
  sanitizeTextForTTS,
} = require('./responseSanitizer');

module.exports = {
  cleanTextForTTS,
  sanitizeAssistantResponse,
  sanitizeTextForTTS,
};
