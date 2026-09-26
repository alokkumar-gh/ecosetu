// EcoSetu AI Service
// Canonical AI abstraction orchestrating LLM / fallback providers
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md

const logger = require('../../config/logger');
const GeminiProvider = require('./providers/GeminiProvider');
const GroqProvider = require('./providers/GroqProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');
const RuleFallbackProvider = require('./providers/RuleFallbackProvider');

const { sanitizeAssistantResponse, cleanTextForTTS } = require('../../utils/responseSanitizer');

class AIService {
  constructor() {
    this.providers = {
      groq: new GroqProvider(),
      gemini: new GeminiProvider(),
      openai: new OpenAIProvider(),
      'rule-fallback': new RuleFallbackProvider(),
    };

    this.activeProviderName = this._detectDefaultProvider();
  }

  /**
   * Determine default provider from environment configuration or available keys
   * Enforces AI_BUDGET_MODE=FREE_ONLY to avoid accidental paid provider calls
   * @private
   */
  _detectDefaultProvider() {
    const isFreeOnly = (process.env.AI_BUDGET_MODE || 'FREE_ONLY').toUpperCase() === 'FREE_ONLY';
    const explicit = (process.env.AI_PROVIDER || process.env.ECO_SAATHI_AI_PROVIDER || '').toLowerCase();

    // 1. Explicit provider configured
    if (explicit && this.providers[explicit]) {
      if (isFreeOnly && (explicit === 'openai')) {
        logger.warn(`[AIService] AI_BUDGET_MODE=FREE_ONLY is active. Provider '${explicit}' is disabled. Using 'groq' or 'rule-fallback'.`);
      } else if (this.providers[explicit].isConfigured()) {
        return explicit;
      }
    }

    // 2. Groq is the primary external LLM
    if (this.providers.groq.isConfigured()) {
      return 'groq';
    }

    // 3. If not free-only or if gemini has free tier configured
    if (!isFreeOnly && this.providers.gemini.isConfigured()) {
      return 'gemini';
    }

    // 4. Fallback to rule-based offline provider
    return 'rule-fallback';
  }

  /**
   * Get active provider instance
   * @returns {import('./AIProvider')}
   */
  getActiveProvider() {
    const isFreeOnly = (process.env.AI_BUDGET_MODE || 'FREE_ONLY').toUpperCase() === 'FREE_ONLY';
    const currentName = this._detectDefaultProvider();
    
    // Safety check for free-only budget mode
    if (isFreeOnly && currentName === 'openai') {
      return this.providers.groq.isConfigured() ? this.providers.groq : this.providers['rule-fallback'];
    }

    return this.providers[currentName] || this.providers['rule-fallback'];
  }

  /**
   * Set active provider dynamically
   * @param {string} name - 'groq' | 'gemini' | 'openai' | 'rule-fallback'
   */
  setProvider(name) {
    if (!this.providers[name]) {
      throw new Error(`Unsupported AI provider: ${name}`);
    }
    const isFreeOnly = (process.env.AI_BUDGET_MODE || 'FREE_ONLY').toUpperCase() === 'FREE_ONLY';
    if (isFreeOnly && name === 'openai') {
      throw new Error(`Cannot select paid provider '${name}' when AI_BUDGET_MODE=FREE_ONLY is active`);
    }
    this.activeProviderName = name;
  }

  /**
   * Primary generation method with automatic graceful fallback & response sanitization
   * @param {object} params
   * @returns {Promise<{ text: string, rawText?: string, toolCalls: Array<object>|null, provider: string, latencyMs: number }>}
   */
  async generate(params) {
    const primary = this.getActiveProvider();

    try {
      if (primary.isConfigured()) {
        const result = await primary.generate(params);
        logger.info(`[AIService] Successfully generated response via primary provider: ${primary.name}`);
        const cleanText = sanitizeAssistantResponse(result.text);
        return {
          ...result,
          text: cleanText,
          rawText: result.rawText || result.text,
          provider: primary.name,
        };
      }
    } catch (err) {
      logger.warn(`[AIService] Primary provider '${primary.name}' failed (${err?.message}). Gracefully falling back to rule-fallback.`);
    }

    // Fallback execution
    const fallback = this.providers['rule-fallback'];
    const fallbackResult = await fallback.generate(params);
    const cleanFallbackText = sanitizeAssistantResponse(fallbackResult.text);
    return {
      ...fallbackResult,
      text: cleanFallbackText,
      rawText: fallbackResult.text,
      provider: 'rule-fallback',
    };
  }

  /**
   * Sanitizer helper utilities
   */
  sanitizeAssistantResponse(text) {
    return sanitizeAssistantResponse(text);
  }

  cleanTextForTTS(text) {
    return cleanTextForTTS(text);
  }
}

module.exports = new AIService();
