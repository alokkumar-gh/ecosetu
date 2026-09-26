/**
 * EcoSetu — Roboflow Vision Provider
 * Wraps Roboflow hosted inference service (v43 77-class model) into the VisionProvider interface.
 */

const VisionProvider = require('../VisionProvider');
const roboflowService = require('../../roboflowService');
const { mapRoboflowClass } = require('../../roboflowTaxonomyMapper');
const logger = require('../../../config/logger');

class RoboflowVisionProvider extends VisionProvider {
  constructor() {
    super('roboflow');
  }

  isConfigured() {
    return roboflowService.isConfigured();
  }

  async analyze(imageBuffer, options = {}) {
    if (!imageBuffer || imageBuffer.length === 0) {
      return { success: false, errorType: 'INVALID_IMAGE', message: 'Empty image buffer' };
    }

    try {
      const result = await roboflowService.predict(imageBuffer, options);
      if (!result || !result.success) {
        return {
          success: false,
          errorType: result?.errorType || 'INFERENCE_FAILED',
          message: result?.message || 'Vision provider inference failed',
        };
      }

      // Map raw detections to standardized objects
      const detectedObjects = (result.detections || []).map((det) => {
        const mapped = mapRoboflowClass(det.class);
        return {
          label: det.class,
          category: mapped.category,
          confidence: det.confidence,
          bbox: det.bbox || null,
        };
      });

      return {
        success: true,
        category: result.category || 'OTHER',
        confidence: result.confidence || 0.0,
        detectedObjects,
        modelVersion: result.modelVersion || roboflowService.modelVersion,
        inferenceTimeMs: result.inferenceTimeMs || 0,
      };
    } catch (err) {
      logger.error(`[RoboflowVisionProvider] Inference error: ${err.message}`);
      return {
        success: false,
        errorType: 'ROBOFLOW_ERROR',
        message: err.message,
      };
    }
  }
}

module.exports = new RoboflowVisionProvider();
