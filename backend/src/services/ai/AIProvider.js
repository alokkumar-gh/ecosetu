// EcoSetu AI Provider Base Interface
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md

class AIProvider {
  /**
   * @param {string} name - Provider identifier (e.g. 'gemini', 'groq', 'openai', 'fallback')
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if provider has necessary API keys and configuration
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }

  /**
   * Generate text / structured tool-call response
   * @param {object} params
   * @param {string} params.prompt - User message / prompt
   * @param {string} [params.systemPrompt] - System instructions
   * @param {Array<object>} [params.messages] - Conversation history [{ role, content }]
   * @param {Array<object>} [params.tools] - Available tool definitions
   * @param {number} [params.temperature] - Sampling temperature (0.0 to 1.0)
   * @param {number} [params.maxTokens] - Maximum tokens in response
   * @returns {Promise<{ text: string, toolCalls: Array<object>|null, rawResponse: any, latencyMs: number }>}
   */
  async generate(params) {
    throw new Error(`generate() not implemented in ${this.constructor.name}`);
  }
}

module.exports = AIProvider;
