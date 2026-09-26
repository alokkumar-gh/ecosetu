/**
 * bhashiniClient.js
 * Low-level HTTP Transport Client for BHASHINI Dhruva & ULCA Inference Services.
 *
 * Security & Reliability:
 * - Credentials strictly server-side (never leaked to clients).
 * - Sanitized logging (zero secrets, zero raw audio content in logs).
 * - Configurable request timeout via AbortController.
 * - Single-retry resilience with backoff on transient network failures.
 */

const environment = require('../../config/environment');
const logger = require('../../config/logger');
const AppError = require('../../utils/AppError');

class BhashiniClient {
  constructor() {
    this.inferenceEndpoint =
      process.env.BHASHINI_ENDPOINT ||
      environment.bhashiniEndpoint ||
      'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

    this.discoveryEndpoint =
      process.env.BHASHINI_DISCOVERY_ENDPOINT ||
      environment.bhashiniDiscoveryEndpoint ||
      'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';

    this.defaultTimeoutMs = 25000;
  }

  getApiKey() {
    return (
      process.env.BHASHINI_API_KEY ||
      process.env.BHASHINI_INFERENCE_API_KEY ||
      environment.bhashiniInferenceApiKey ||
      ''
    ).trim();
  }

  getUserId() {
    return (
      process.env.BHASHINI_USER_ID ||
      environment.bhashiniUserId ||
      ''
    ).trim();
  }

  getPipelineId() {
    return (
      process.env.BHASHINI_PIPELINE_ID ||
      environment.bhashiniPipelineId ||
      ''
    ).trim();
  }

  getUdyatKey() {
    return (
      process.env.BHASHINI_UDYAT_KEY ||
      process.env.BHASHINI_ULCA_API_KEY ||
      environment.bhashiniUdyatKey ||
      ''
    ).trim();
  }

  /**
   * Check if BHASHINI server credentials are fully configured.
   * @returns {boolean}
   */
  isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key.length > 0);
  }

  /**
   * Dispatches an inference request to BHASHINI Dhruva Pipeline with single-retry logic.
   *
   * @param {Array<Object>} pipelineTasks - Array of pipeline task definitions
   * @param {Object} inputData - Structured input data (audio, text, image)
   * @param {Object} [options]
   * @param {number} [options.timeoutMs=25000] - Request timeout in ms
   * @param {number} [options.maxRetries=1] - Maximum retries on transient errors
   * @returns {Promise<{ data: any, latencyMs: number }>}
   */
  async callPipeline(pipelineTasks, inputData, options = {}) {
    if (!this.isConfigured()) {
      throw AppError.badRequest(
        'BHASHINI voice credentials are not configured on server (BHASHINI_API_KEY / BHASHINI_INFERENCE_API_KEY required)',
        'BHASHINI_NOT_CONFIGURED'
      );
    }

    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = typeof options.maxRetries === 'number' ? options.maxRetries : 1;

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        return await this._executeRequest(pipelineTasks, inputData, timeoutMs);
      } catch (err) {
        lastError = err;
        // Do not retry client/auth errors (401, 403, 400 with specific code)
        if (
          err.statusCode === 401 ||
          err.statusCode === 403 ||
          err.errorCode === 'BHASHINI_NOT_CONFIGURED'
        ) {
          throw err;
        }

        if (attempt <= maxRetries) {
          logger.warn(`[BhashiniClient] Transient error on attempt ${attempt}. Retrying once...`, {
            error: err.message,
          });
          await new Promise((res) => setTimeout(res, 300));
        }
      }
    }

    throw lastError || AppError.badRequest('BHASHINI service request failed after retry', 'BHASHINI_REQUEST_FAILED');
  }

  /**
   * Single attempt HTTP execution.
   * @private
   */
  async _executeRequest(pipelineTasks, inputData, timeoutMs) {
    const apiKey = this.getApiKey();
    const userId = this.getUserId();
    const udyatKey = this.getUdyatKey();
    const pipelineId = this.getPipelineId();

    const payload = {
      pipelineTasks,
      inputData,
    };

    if (pipelineId) {
      payload.pipelineConfig = { pipelineId };
    }

    const headers = {
      'Content-Type': 'application/json',
      Accept: '*/*',
      Authorization: apiKey,
    };

    if (userId) {
      headers['userID'] = userId;
    }
    if (udyatKey) {
      headers['ulcaApiKey'] = udyatKey;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const taskTypes = (pipelineTasks || []).map((t) => t.taskType);
      logger.debug('[BhashiniClient] Sending inference request', {
        endpoint: this.inferenceEndpoint,
        taskTypes,
      });

      const response = await fetch(this.inferenceEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }
      }

      if (!response.ok) {
        const errMsg =
          data?.message ||
          data?.error ||
          data?.pipelineResponse?.[0]?.statusMessage ||
          `BHASHINI API error (HTTP ${response.status})`;

        logger.warn('[BhashiniClient] Pipeline error response', {
          status: response.status,
          error: errMsg,
          latencyMs,
        });

        if (response.status === 401 || response.status === 403) {
          throw AppError.unauthorized(
            'BHASHINI authorization failed. Please verify server inference API key.',
            'BHASHINI_UNAUTHORIZED'
          );
        }
        if (response.status === 429) {
          throw AppError.badRequest('BHASHINI rate limit exceeded. Please retry shortly.', 'BHASHINI_RATE_LIMIT');
        }
        throw AppError.badRequest(errMsg, 'BHASHINI_API_ERROR');
      }

      return { data, latencyMs };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw AppError.timeoutError(`BHASHINI request timed out after ${timeoutMs}ms`);
      }
      if (err instanceof AppError) {
        throw err;
      }
      throw AppError.badRequest(`BHASHINI connection error: ${err.message}`, 'BHASHINI_NETWORK_ERROR');
    }
  }
}

const bhashiniClient = new BhashiniClient();

module.exports = {
  BhashiniClient,
  bhashiniClient,
};
