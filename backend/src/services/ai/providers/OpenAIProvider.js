// EcoSetu OpenAI AI Provider
// OpenAI Chat Completions API

const AIProvider = require('../AIProvider');

class OpenAIProvider extends AIProvider {
  constructor(options = {}) {
    super('openai');
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generate({ prompt, systemPrompt, messages = [], tools = [], temperature = 0.2, maxTokens = 1024 }) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured');
    }

    const startTime = Date.now();
    const formattedMessages = [];

    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      formattedMessages.push({ role: msg.role, content: msg.content });
    }

    if (prompt && (messages.length === 0 || messages[messages.length - 1].content !== prompt)) {
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
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
        throw new Error(`OpenAI API error (HTTP ${response.status}): ${errorText.substring(0, 300)}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const message = data.choices?.[0]?.message;

      let toolCalls = null;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        toolCalls = message.tool_calls.map((tc) => {
          let args = {};
          try {
            args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch {}
          return {
            name: tc.function.name,
            arguments: args,
          };
        });
      }

      return {
        text: (message?.content || '').trim(),
        toolCalls,
        rawResponse: data,
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}

module.exports = OpenAIProvider;
