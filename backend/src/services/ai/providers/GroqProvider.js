// EcoSetu Groq AI Provider
// High-performance OpenAI-compatible Chat Completions API with fast inference
// Primary external LLM provider for Eco-Saathi conversational intelligence

const AIProvider = require('../AIProvider');
const logger = require('../../../config/logger');
const { sanitizeAssistantResponse } = require('../../../utils/responseSanitizer');

class GroqProvider extends AIProvider {
  constructor(options = {}) {
    super('groq');
    this.apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.GROQ_API_KEY || '');
    this.model = options.model || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    this.baseUrl = options.baseUrl || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions';
    this.timeoutMs = options.timeoutMs || parseInt(process.env.GROQ_TIMEOUT_MS, 10) || 15000;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generate({
    prompt,
    systemPrompt,
    systemInstruction,
    messages = [],
    tools = [],
    temperature = 0.2,
    maxTokens = 1024,
  }) {
    if (!this.isConfigured()) {
      throw new Error('Groq API key is not configured');
    }

    const startTime = Date.now();
    const effectiveSystemPrompt = systemInstruction || systemPrompt;
    const formattedMessages = [];

    if (effectiveSystemPrompt) {
      formattedMessages.push({ role: 'system', content: effectiveSystemPrompt });
    }

    for (const msg of messages) {
      if (msg && msg.role && msg.content) {
        formattedMessages.push({ role: msg.role, content: msg.content });
      }
    }

    if (prompt && (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].content !== prompt)) {
      formattedMessages.push({ role: 'user', content: prompt });
    }

    const payload = {
      model: this.model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
    };

    if (Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'object', properties: {} },
        },
      }));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error(`Groq rate limit exceeded (HTTP 429)`);
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Groq authentication failure (HTTP ${response.status})`);
        }
        throw new Error(`Groq API error (HTTP ${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const choice = data.choices?.[0];
      const message = choice?.message;

      let toolCalls = null;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        toolCalls = message.tool_calls.map((tc) => {
          let args = {};
          try {
            args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch {
            args = {};
          }
          return {
            name: tc.function.name,
            arguments: args,
          };
        });
      }

      const rawText = message?.content || '';
      const sanitizedText = sanitizeAssistantResponse(rawText);

      logger.info(`[GroqProvider] Generated response in ${latencyMs}ms using model '${this.model}'`);

      return {
        text: sanitizedText,
        rawText: rawText.trim(),
        toolCalls,
        rawResponse: data,
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Groq request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Safe, lightweight connectivity check to verify Groq API connectivity without leaking secrets.
   * Sends minimal payload (1-2 tokens) with short timeout.
   * @param {object} [options]
   * @param {number} [options.timeoutMs]
   * @returns {Promise<{ ok: boolean, status: string, latencyMs?: number, error?: string }>}
   */
  async checkConnectivity(options = {}) {
    if (!this.isConfigured()) {
      return {
        ok: false,
        status: 'not_configured',
        error: 'GROQ_API_KEY is not configured',
      };
    }

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || Math.min(this.timeoutMs || 8000, 8000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
          max_tokens: 5,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          ok: true,
          status: 'ok',
          latencyMs,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          status: 'authentication_error',
          error: `HTTP ${response.status} Authentication Failure`,
          latencyMs,
        };
      }

      if (response.status === 429) {
        return {
          ok: false,
          status: 'rate_limited',
          error: 'HTTP 429 Rate Limit Exceeded',
          latencyMs,
        };
      }

      return {
        ok: false,
        status: 'api_error',
        error: `HTTP ${response.status} API Error`,
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        return {
          ok: false,
          status: 'timeout',
          error: `Request timed out after ${timeoutMs}ms`,
          latencyMs,
        };
      }
      return {
        ok: false,
        status: 'network_error',
        error: err.message || 'Network connection error',
        latencyMs,
      };
    }
  }
}

module.exports = GroqProvider;
