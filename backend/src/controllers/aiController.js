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
      console.log(`[EcoSetu AI DEBUG] Backend /ai/predict request received. User role: ${req.user?.role || 'anonymous'}, user ID: ${req.user?.id || 'none'}`);
      if (!req.file) {
        console.warn('[EcoSetu AI DEBUG] Backend: req.file is missing in request');
        throw AppError.badRequest('Image file is required');
      }

      console.log(`[EcoSetu AI DEBUG] Backend: image received -> filename: ${req.file.filename}, mimetype: ${req.file.mimetype}, sizeBytes: ${req.file.buffer?.length || 0}`);

      // Enforce file size, mime-type and magic bytes validation (docs/13_SECURITY_PRIVACY.md)
      validateImageFile(req.file);

      // Call AI microservice
      console.log('[EcoSetu AI DEBUG] Backend: Calling aiService.predictCategory...');
      const prediction = await aiService.predictCategory(
        req.file.buffer,
        req.file.filename,
        req.file.mimetype
      );

      // If inference is unavailable or failed, log detailed errorType and return 503 (docs/05_API_SPECIFICATION.md)
      if (!prediction || !prediction.success) {
        const errType = prediction?.errorType || 'AI_SERVICE_UNAVAILABLE';
        const errMsg = prediction?.message || 'Inference service unavailable';
        console.warn(`[EcoSetu AI DEBUG] Backend: aiService returned error [${errType}]: ${errMsg}`);
        throw AppError.serviceUnavailable(`AI service is temporarily unavailable (${errType}). Please select category manually.`);
      }

      console.log(`[EcoSetu AI DEBUG] Backend: response returned to mobile -> category: ${prediction.category}, confidence: ${prediction.confidence}, has_detection: ${prediction.has_detection}`);

      return res.status(200).json({
        success: true,
        data: {
          prediction: {
            has_detection: prediction.has_detection,
            category: prediction.category,
            confidence: prediction.confidence,
            confidence_level: prediction.confidence_level,
            review_required: prediction.review_required,
            review_reason: prediction.review_reason,
            bbox: prediction.bbox,
            detections: prediction.detections,
            allPredictions: prediction.allPredictions,
            modelVersion: prediction.modelVersion,
            inferenceTimeMs: prediction.inferenceTimeMs,
          },
        },
      });
    } catch (err) {
      console.error('[EcoSetu AI DEBUG] Backend predict controller error:', err?.message || err);
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

  /**
   * GET /api/v1/ai/status
   * Safe diagnostic endpoint returning AI provider status without leaking secrets
   */
  async status(req, res, next) {
    try {
      const statusData = aiService.getStatus();
      return res.status(200).json({
        success: true,
        data: statusData,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AiController();
