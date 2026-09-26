/**
 * EcoSetu — Central Assistant & Groq Response Sanitizer
 * Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/13_SECURITY_PRIVACY.md
 * 
 * Sanitizes natural-language LLM (Groq / Gemini / Fallback) output before
 * presenting to user UI or passing to TTS voice engines.
 * 
 * Guarantees:
 * 1. Zero markdown formatting characters (*, #, `, ~, _) in user-facing UI text.
 * 2. Complete preservation of actual message content, numbers, dates, times,
 *    currency symbols (₹), status enums, IDs, emojis (for UI), and vernacular
 *    languages (Hindi, Hinglish, Odia, Marathi, English).
 * 3. Specialized speech sanitization for TTS (stripping emojis and visual symbols).
 * 4. Handling of JSON-wrapped accidental outputs without leaking JSON syntax.
 */

/**
 * Extract text from accidental JSON string or code block wrapper
 * @param {string} text 
 * @returns {string}
 */
function unwrapJsonIfNeeded(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();

  // If text starts with '{' and ends with '}', try extracting human-readable message
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.message === 'string') return parsed.message;
      if (typeof parsed.text === 'string') return parsed.text;
      if (typeof parsed.response === 'string') return parsed.response;
      if (typeof parsed.content === 'string') return parsed.content;
    } catch {
      // Not valid JSON, proceed normally
    }
  }

  // If text is wrapped in ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch) {
    const inside = codeBlockMatch[1].trim();
    if (inside.startsWith('{') && inside.endsWith('}')) {
      try {
        const parsed = JSON.parse(inside);
        if (typeof parsed.message === 'string') return parsed.message;
        if (typeof parsed.text === 'string') return parsed.text;
      } catch {}
    }
    return inside;
  }

  return text;
}

/**
 * Sanitize assistant/Groq response for display in UI
 * Removes markdown syntax, asterisks, hashes, backticks, bullet prefixes, and links
 * while preserving newlines, list structure, numbers, currency, vernacular text, and emojis.
 * 
 * @param {string} rawText - Unsanitized output from Groq/LLM
 * @returns {string} Clean user-facing text
 */
function sanitizeAssistantResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let text = unwrapJsonIfNeeded(rawText);

  // 1. Remove code blocks (fenced ```lang ... ```)
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '');
  });

  // 2. Remove inline code backticks `code` -> code
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Remove image embeds ![alt](url) -> ''
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');

  // 4. Convert markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 5. Remove markdown headers (# Header -> Header, ## Header -> Header)
  text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');

  // 6. Remove any sequence of 4 or more asterisks (e.g. ****Hello****, ****Hello)
  text = text.replace(/\*{4,}/g, '');

  // 7. Remove triple, double, and single asterisks (***text***, **text**, *text*)
  text = text.replace(/\*{3}([^*]+)\*{3}/g, '$1');
  text = text.replace(/\*{2}([^*]+)\*{2}/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');

  // 8. Remove underscores used for emphasis (___text___, __text__, _text_)
  // Be careful not to replace underscores inside identifiers like PICKUP_SCHEDULED
  text = text.replace(/(^|\s)_{3}([^\s_]+)_{3}(\s|$)/g, '$1$2$3');
  text = text.replace(/(^|\s)_{2}([^\s_]+)_{2}(\s|$)/g, '$1$2$3');
  text = text.replace(/(^|\s)_([^\s_]+)_(\s|$)/g, '$1$2$3');

  // 9. Remove strikethrough ~~text~~ -> text
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // 10. Remove blockquotes (> quote -> quote)
  text = text.replace(/^[ \t]*>[ \t]+/gm, '');

  // 11. Remove horizontal rules (---, ***, ___)
  text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 12. Clean list bullets (*, -, +, •) at start of lines without destroying
  // hyphens inside words (e.g. "e-waste", "Eco-Saathi", "non-hazardous")
  text = text.replace(/^[ \t]*[-*+•][ \t]+/gm, '');

  // 13. Remove table pipe separators
  text = text.replace(/\|/g, ' ');

  // 14. Remove any remaining stray asterisks, backticks, or leading/trailing hashes
  text = text.replace(/[*`~]/g, '');
  text = text.replace(/^[ \t]*#+[ \t]*/gm, '');

  // 15. Normalize spaces on each line while preserving paragraphs / newlines
  const lines = text.split('\n').map((line) => {
    return line.replace(/[ \t]+/g, ' ').trim();
  });

  // Re-join lines and collapse 3+ consecutive newlines to 2
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Sanitize text for Text-to-Speech (TTS) voice engines
 * Strips all markdown plus emojis, special symbols, and visual indicators,
 * converting newlines to spoken sentence pauses.
 * 
 * @param {string} rawText - Raw text or display text
 * @returns {string} Voice-ready, speech-friendly text
 */
function cleanTextForTTS(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  // 1. Run standard display sanitization first
  let cleaned = sanitizeAssistantResponse(rawText);

  // 2. Remove emojis and non-speech symbols for TTS voice engine
  // Matches Unicode emoji ranges (emoticons, symbols, pictographs, transport, flags)
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '');

  // 3. Remove numbered list prefixes e.g. "1. " or "2) " for smoother speech flow
  cleaned = cleaned.replace(/^[\s]*\d+[\.\)]\s+/gm, '');

  // 4. Convert single newlines to space and double newlines to sentence periods
  cleaned = cleaned
    .replace(/\n\s*\n/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();

  return cleaned;
}

module.exports = {
  sanitizeAssistantResponse,
  cleanTextForTTS,
  sanitizeTextForTTS: cleanTextForTTS, // Alias for clear naming
};
