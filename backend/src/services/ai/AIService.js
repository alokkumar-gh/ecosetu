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
   * Return comprehensive AI health and diagnostics for Eco-Saathi without leaking secrets.
   * @param {object} [options]
   * @param {boolean} [options.checkConnectivity=false] - Whether to execute active Groq API test
   * @returns {Promise<object>} Diagnostics object
   */
  async getDiagnostics({ checkConnectivity = false } = {}) {
    const isFreeOnly = (process.env.AI_BUDGET_MODE || 'FREE_ONLY').toUpperCase() === 'FREE_ONLY';
    const activeProvider = this.getActiveProvider();
    const groqProvider = this.providers.groq;
    const ruleFallback = this.providers['rule-fallback'];

    const groqConfigured = Boolean(groqProvider && groqProvider.isConfigured());
    const groqModel = groqProvider ? groqProvider.model : (process.env.GROQ_MODEL || null);

    let groqConnectivity = groqConfigured ? 'untested' : 'not_configured';
    let groqLatencyMs = null;
    let groqError = null;

    if (checkConnectivity) {
      if (groqConfigured && groqProvider && typeof groqProvider.checkConnectivity === 'function') {
        const conn = await groqProvider.checkConnectivity();
        groqConnectivity = conn.status;
        groqLatencyMs = conn.latencyMs || null;
        if (!conn.ok && conn.error) {
          groqError = conn.error;
        }
      } else {
        groqConnectivity = 'not_configured';
      }
    }

    const isHealthy = activeProvider.name === 'groq'
      ? (checkConnectivity ? groqConnectivity === 'ok' : groqConfigured)
      : true;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      active_provider: activeProvider.name,
      budget_mode: isFreeOnly ? 'FREE_ONLY' : 'FLEXIBLE',
      paid_provider_blocking: isFreeOnly,
      groq: {
        configured: groqConfigured,
        model: groqModel || 'not_configured',
        model_configured: Boolean(groqModel),
        connectivity: groqConnectivity,
        latency_ms: groqLatencyMs,
        ...(groqError ? { error: groqError } : {}),
      },
      fallback: {
        provider: 'RuleFallbackProvider',
        available: Boolean(ruleFallback),
      },
    };
  }

  /**
   * Fast synchronous health check for basic configuration
   */
  getHealth() {
    const isFreeOnly = (process.env.AI_BUDGET_MODE || 'FREE_ONLY').toUpperCase() === 'FREE_ONLY';
    const activeProvider = this.getActiveProvider();
    const groqProvider = this.providers.groq;
    const ruleFallback = this.providers['rule-fallback'];
    const groqConfigured = Boolean(groqProvider && groqProvider.isConfigured());

    return {
      status: groqConfigured || activeProvider.name === 'rule-fallback' ? 'ok' : 'degraded',
      active_provider: activeProvider.name,
      budget_mode: isFreeOnly ? 'FREE_ONLY' : 'FLEXIBLE',
      paid_provider_blocking: isFreeOnly,
      groq: {
        configured: groqConfigured,
        model: groqProvider?.model || process.env.GROQ_MODEL || 'not_configured',
        model_configured: Boolean(groqProvider?.model || process.env.GROQ_MODEL),
        connectivity: groqConfigured ? 'configured_ready' : 'not_configured',
      },
      fallback: {
        provider: 'RuleFallbackProvider',
        available: Boolean(ruleFallback),
      },
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
