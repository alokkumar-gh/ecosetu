// EcoSetu AI Microservice Communication Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.3, docs/05_API_SPECIFICATION.md Section 11, docs/24_ERROR_EDGE_CASES.md Section 4

const prisma = require('../config/database');
const environment = require('../config/environment');
const logger = require('../config/logger');
const roboflowService = require('./roboflowService');
const AppError = require('../utils/AppError');
const { EWASTE_CATEGORIES } = require('../utils/constants');

class AiService {
  /**
   * Primary category prediction dispatcher.
   * Routes to Roboflow v43 hosted inference provider by default when configured,
   * while preserving fallback compatibility with legacy material-detection-v0.2.0 microservice.
   *
   * @param {Buffer} imageBuffer - Uploaded image binary buffer
   * @param {string} filename - Original or generated image filename
   * @param {string} mimetype - Image MIME type (image/jpeg, image/png)
   * @param {object} options - Optional inference parameters
   * @returns {Promise<object|null>} Standardized prediction result object or null if unavailable
   */
  async predictCategory(imageBuffer, filename = 'upload.jpg', mimetype = 'image/jpeg', options = {}) {
    if (!imageBuffer || imageBuffer.length === 0) {
      console.warn('[EcoSetu AI DEBUG] Backend aiService: empty image buffer provided');
      return null;
    }

    const provider = (environment.aiProvider || 'roboflow').toLowerCase();

    // ── Primary: Roboflow v43 Hosted Inference Provider ──
    if (provider === 'roboflow' || roboflowService.isConfigured()) {
      console.log(`[EcoSetu AI DEBUG] Backend aiService: Using Roboflow inference provider (model: ${roboflowService.modelId})`);
      const roboflowResult = await roboflowService.predict(imageBuffer, options);

      if (roboflowResult && roboflowResult.success) {
        console.log(`[EcoSetu AI DEBUG] Backend aiService: Roboflow returned category: ${roboflowResult.category}, conf: ${roboflowResult.confidence}`);
        return roboflowResult;
      }

      if (roboflowResult && roboflowResult.errorType) {
        console.warn(`[EcoSetu AI DEBUG] Backend aiService: Roboflow returned error [${roboflowResult.errorType}]: ${roboflowResult.message}`);
        // If legacy fallback is not configured or disabled, propagate the Roboflow error directly
        if (!environment.aiServiceUrl || provider === 'roboflow') {
          return roboflowResult;
        }
      }

      console.warn('[EcoSetu AI DEBUG] Backend aiService: Roboflow inference unavailable, attempting legacy fallback if available...');
    }

    // ── Fallback / Legacy: FastAPI Microservice (material-detection-v0.2.0) ──
    return this._predictLegacyFastApi(imageBuffer, filename, mimetype);
  }

  /**
   * Legacy FastAPI microservice prediction method (preserved for backward compatibility).
   * @private
   */
  async _predictLegacyFastApi(imageBuffer, filename, mimetype) {
    const aiUrl = `${environment.aiServiceUrl}/predict`;
    console.log(`[EcoSetu AI DEBUG] Backend aiService: Legacy FastAPI request started -> URL: ${aiUrl}, size: ${imageBuffer.length} bytes`);
    
    // 120-second timeout to accommodate Render cold-starts + CPU inference + network latency
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS, 10) || 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: mimetype });
      formData.append('image', blob, filename);

      const response = await fetch(aiUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[EcoSetu AI DEBUG] Backend aiService: FastAPI HTTP status: ${response.status}`);

      if (!response.ok) {
        logger.warn(`AI microservice returned HTTP ${response.status} from ${aiUrl}`);
        console.warn(`[EcoSetu AI DEBUG] Backend aiService: Non-OK status from FastAPI: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`[EcoSetu AI DEBUG] Backend aiService: FastAPI response body: ${JSON.stringify(data)}`);
      return {
        success: data.success !== undefined ? data.success : true,
        has_detection: data.has_detection !== undefined ? data.has_detection : (data.category && data.category !== 'OTHER'),
        category: data.category,
        confidence: data.confidence !== undefined ? data.confidence : 0.0,
        confidence_level: data.confidence_level || 'LOW',
        review_required: data.review_required !== undefined ? data.review_required : false,
        review_reason: data.review_reason || null,
        bbox: data.bbox || null,
        detections: data.detections || [],
        allPredictions: data.predictions || [],
        modelVersion: data.model_version || 'material-detection-v0.2.0',
        inferenceTimeMs: data.inference_time_ms || 0,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        logger.warn(`Legacy AI microservice request timed out after ${timeoutMs / 1000}s: ${aiUrl}`);
        console.warn(`[EcoSetu AI DEBUG] Backend aiService: Legacy AI request timed out after ${timeoutMs / 1000}s: ${aiUrl}`);
      } else {
        logger.warn(`Legacy AI microservice unreachable at ${aiUrl}: ${err.message}`);
        console.warn(`[EcoSetu AI DEBUG] Backend aiService: Legacy AI unreachable at ${aiUrl}: ${err.message}`);
      }
      return null;
    }
  }

  /**
   * Return EcoVision material detection health and configuration
   * @returns {object}
   */
  getVisionHealth() {
    const isRoboflow = roboflowService.isConfigured();
    return {
      status: isRoboflow || Boolean(environment.aiServiceUrl) ? 'ok' : 'unconfigured',
      provider: isRoboflow ? 'roboflow' : (environment.aiServiceUrl ? 'legacy_fastapi' : 'none'),
      model_loaded: true,
      model_version: isRoboflow ? roboflowService.modelId : 'material-detection-v0.2.0',
      configured: isRoboflow || Boolean(environment.aiServiceUrl),
    };
  }

  /**
   * Diagnostic method reporting current AI provider and configuration status without leaking keys.
   * @returns {object} Status summary object
   */
  getStatus() {
    const isConfigured = roboflowService.isConfigured();
    const aiIntelligenceService = require('./ai/AIService');
    const ecoSaathiHealth = aiIntelligenceService.getHealth();

    return {
      status: isConfigured ? 'ok' : 'degraded',
      service: 'ecosetu-ai',
      provider: environment.aiProvider || 'roboflow',
      modelId: roboflowService.modelId,
      apiKeyStatus: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      endpoint: `https://detect.roboflow.com/${roboflowService.modelId}`,
      architecture: {
        inferenceProvider: 'Roboflow Hosted Inference API',
        backendHost: 'Render (Node.js Express API Bridge)',
        mobileClient: 'EcoSetu Android Native',
      },
      legacyFallbackAvailable: Boolean(environment.aiServiceUrl),
      vision: this.getVisionHealth(),
      eco_saathi: ecoSaathiHealth,
    };
  }

  /**
   * Return comprehensive AI health diagnostics including optional live Groq connectivity check
   * @param {object} [options]
   * @param {boolean} [options.checkConnectivity=false]
   * @returns {Promise<object>}
   */
  async getCompositeHealth({ checkConnectivity = false } = {}) {
    const aiIntelligenceService = require('./ai/AIService');
    const vision = this.getVisionHealth();
    const ecoSaathi = await aiIntelligenceService.getDiagnostics({ checkConnectivity });

    const isHealthy = vision.status === 'ok' && ecoSaathi.status === 'ok';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'ecosetu-ai',
      timestamp: new Date().toISOString(),
      vision,
      eco_saathi: ecoSaathi,
      model_loaded: vision.model_loaded,
      model_version: vision.model_version,
      architecture: {
        inferenceProvider: vision.provider === 'roboflow' ? 'Roboflow Hosted Inference API (v43)' : 'Legacy FastAPI (YOLO)',
        backendHost: 'Render (Node.js Express API Bridge)',
        mobileClient: 'EcoSetu Android Native',
      },
    };
  }

  /**
   * Record citizen feedback on AI classification result (EC-AI-03)
   * @param {string} citizenUserId - Authenticated citizen UUID
   * @param {object} feedbackData - { predictionId, wasAccepted, correctedCategory }
   * @returns {Promise<object>} Updated prediction record
   */
  async recordFeedback(citizenUserId, { predictionId, wasAccepted, correctedCategory }) {
    const prediction = await prisma.aiPrediction.findUnique({
      where: { id: predictionId },
      include: { ewasteItem: true },
    });

    if (!prediction) {
      throw AppError.notFound('AI prediction not found');
    }

    // Ensure citizen owns the e-waste item
    if (prediction.ewasteItem && prediction.ewasteItem.citizenId !== citizenUserId) {
      throw AppError.forbidden('You can only submit feedback for your own items');
    }

    if (!wasAccepted && (!correctedCategory || !EWASTE_CATEGORIES[correctedCategory])) {
      throw AppError.validation('A valid correctedCategory is required when wasAccepted is false');
    }

    const updated = await prisma.aiPrediction.update({
      where: { id: predictionId },
      data: {
        wasAccepted: Boolean(wasAccepted),
        userCorrectedCategory: wasAccepted ? null : correctedCategory,
      },
    });

    return updated;
  }
}

module.exports = new AiService();
