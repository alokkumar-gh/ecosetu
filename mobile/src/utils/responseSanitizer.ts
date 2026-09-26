/**
 * EcoSetu Mobile — Central Response & Speech Text Sanitizer
 * Mirrors backend sanitization logic to ensure zero Markdown syntax is displayed or spoken.
 */

/**
 * Unwraps JSON or code blocks if present
 */
function unwrapJsonIfNeeded(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.message === 'string') return parsed.message;
      if (typeof parsed.text === 'string') return parsed.text;
      if (typeof parsed.response === 'string') return parsed.response;
      if (typeof parsed.content === 'string') return parsed.content;
    } catch {}
  }

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
 * Sanitize assistant response for UI display
 */
export function sanitizeAssistantResponse(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let text = unwrapJsonIfNeeded(rawText);

  // 1. Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '');
  });

  // 2. Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Remove image embeds
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');

  // 4. Convert markdown links
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 5. Remove markdown headers
  text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');

  // 6. Remove any sequence of 4 or more asterisks
  text = text.replace(/\*{4,}/g, '');

  // 7. Remove triple, double, single asterisks
  text = text.replace(/\*{3}([^*]+)\*{3}/g, '$1');
  text = text.replace(/\*{2}([^*]+)\*{2}/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');

  // 8. Remove underscores used for emphasis
  text = text.replace(/(^|\s)_{3}([^\s_]+)_{3}(\s|$)/g, '$1$2$3');
  text = text.replace(/(^|\s)_{2}([^\s_]+)_{2}(\s|$)/g, '$1$2$3');
  text = text.replace(/(^|\s)_([^\s_]+)_(\s|$)/g, '$1$2$3');

  // 9. Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // 10. Remove blockquotes
  text = text.replace(/^[ \t]*>[ \t]+/gm, '');

  // 11. Remove horizontal rules
  text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 12. Clean list bullets
  text = text.replace(/^[ \t]*[-*+•][ \t]+/gm, '');

  // 13. Remove table pipe separators
  text = text.replace(/\|/g, ' ');

  // 14. Remove stray asterisks, backticks, leading hashes
  text = text.replace(/[*`~]/g, '');
  text = text.replace(/^[ \t]*#+[ \t]*/gm, '');

  // 15. Normalize spaces
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Sanitize text for TTS speech synthesis
 */
export function cleanTextForTTS(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let cleaned = sanitizeAssistantResponse(rawText);

  // Remove emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '');

  // Remove numbered list markers e.g. "1. "
  cleaned = cleaned.replace(/^[\s]*\d+[\.\)]\s+/gm, '');

  // Normalize pauses
  cleaned = cleaned
    .replace(/\n\s*\n/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();

  return cleaned;
}

export default {
  sanitizeAssistantResponse,
  cleanTextForTTS,
  sanitizeTextForTTS: cleanTextForTTS,
};
