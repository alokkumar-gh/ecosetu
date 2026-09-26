// EcoSetu Gemini AI Provider
// Uses Google Gemini REST API (gemini-2.0-flash / gemini-1.5-flash)

const AIProvider = require('../AIProvider');

class GeminiProvider extends AIProvider {
  constructor(options = {}) {
    super('gemini');
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generate({ prompt, systemPrompt, messages = [], tools = [], temperature = 0.2, maxTokens = 1024 }) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured');
    }

    const startTime = Date.now();
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    // Transform messages to Gemini contents format
    const contents = [];

    // Append prior conversation turns
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }],
      });
    }

    // Add current user prompt if not already last message
    if (prompt && (messages.length === 0 || messages[messages.length - 1].content !== prompt)) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    const payload = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    // Map tools to Gemini function declarations if provided
    if (Array.isArray(tools) && tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters || { type: 'OBJECT', properties: {} },
          })),
        },
      ];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText.substring(0, 300)}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      let text = '';
      const toolCalls = [];

      for (const part of parts) {
        if (part.text) {
          text += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }

      return {
        text: text.trim(),
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
        rawResponse: data,
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}

module.exports = GeminiProvider;
