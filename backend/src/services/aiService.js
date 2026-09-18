// EcoSetu AI Microservice Communication Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.3, docs/05_API_SPECIFICATION.md Section 11, docs/24_ERROR_EDGE_CASES.md Section 4

const prisma = require('../config/database');
const environment = require('../config/environment');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const { EWASTE_CATEGORIES } = require('../utils/constants');

class AiService {
  /**
   * Send image to FastAPI microservice for category prediction
   * Handles timeouts (10s) and service failures gracefully returning null (EC-AI-01, EC-AI-05)
   * @param {Buffer} imageBuffer - Uploaded image binary buffer
   * @param {string} filename - Original or generated image filename
   * @param {string} mimetype - Image MIME type (image/jpeg, image/png)
   * @returns {Promise<object|null>} Prediction result object or null if unavailable
   */
  async predictCategory(imageBuffer, filename = 'upload.jpg', mimetype = 'image/jpeg') {
    if (!imageBuffer || imageBuffer.length === 0) {
      return null;
    }

    const aiUrl = `${environment.aiServiceUrl}/predict`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

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

      if (!response.ok) {
        logger.warn(`AI microservice returned HTTP ${response.status} from ${aiUrl}`);
        return null;
      }

      const data = await response.json();
      return {
        category: data.category,
        confidence: data.confidence,
        allPredictions: data.predictions || [],
        modelVersion: data.model_version || 'v1.0',
        inferenceTimeMs: data.inference_time_ms || 0,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        logger.warn(`AI microservice request timed out after 10 seconds: ${aiUrl}`);
      } else {
        logger.warn(`AI microservice unreachable at ${aiUrl}: ${err.message}`);
      }
      return null;
    }
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
