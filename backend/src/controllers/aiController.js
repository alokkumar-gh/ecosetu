// EcoSetu AI Inference & Feedback Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 11, docs/10_BACKEND_ARCHITECTURE.md, docs/11_AI_EWASTE_DETECTION.md

const aiService = require('../services/aiService');
const { validateImageFile } = require('../middleware/uploadMiddleware');
const AppError = require('../utils/AppError');

class AiController {
  /**
   * POST /api/v1/ai/predict
   * Classify an e-waste image via FastAPI microservice
   */
  async predict(req, res, next) {
    try {
      if (!req.file) {
        throw AppError.badRequest('Image file is required');
      }

      // Enforce file size, mime-type and magic bytes validation (docs/13_SECURITY_PRIVACY.md)
      validateImageFile(req.file);

      // Call AI microservice
      const prediction = await aiService.predictCategory(
        req.file.buffer,
        req.file.filename,
        req.file.mimetype
      );

      // If microservice is unavailable or model weights missing, return 503 (docs/05_API_SPECIFICATION.md)
      if (!prediction) {
        throw AppError.serviceUnavailable('AI service is temporarily unavailable. Please select category manually.');
      }

      return res.status(200).json({
        success: true,
        data: {
          prediction: {
            category: prediction.category,
            confidence: prediction.confidence,
            allPredictions: prediction.allPredictions,
            modelVersion: prediction.modelVersion,
            inferenceTimeMs: prediction.inferenceTimeMs,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/ai/feedback
   * Submit citizen feedback on an AI prediction
   */
  async feedback(req, res, next) {
    try {
      const { predictionId, wasAccepted, correctedCategory } = req.body;
      const updated = await aiService.recordFeedback(req.user.id, {
        predictionId,
        wasAccepted,
        correctedCategory,
      });

      return res.status(200).json({
        success: true,
        message: 'Feedback recorded successfully',
        data: {
          prediction: updated,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AiController();
