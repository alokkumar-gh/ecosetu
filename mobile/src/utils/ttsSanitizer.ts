/**
 * EcoSetu Mobile — TTS Markdown & Speech Text Sanitizer (Re-export / Compatibility Layer)
 */

export {
  cleanTextForTTS,
  sanitizeAssistantResponse,
} from './responseSanitizer';

export { cleanTextForTTS as default } from './responseSanitizer';
