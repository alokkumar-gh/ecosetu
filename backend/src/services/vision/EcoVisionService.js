/**
 * EcoSetu — Eco-Vision Service
 * High-level vision orchestration layer for e-waste image analysis.
 * Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/05_API_SPECIFICATION.md Section 11
 */

const roboflowVisionProvider = require('./providers/RoboflowVisionProvider');
const fallbackVisionProvider = require('./providers/FallbackVisionProvider');
const logger = require('../../config/logger');
const { EWASTE_CATEGORIES } = require('../../utils/constants');

// Configurable confidence thresholds (SIH & Project Standard)
const CONFIDENCE_THRESHOLDS = {
  HIGH: parseFloat(process.env.VISION_CONFIDENCE_HIGH || '0.80'),
  MEDIUM: parseFloat(process.env.VISION_CONFIDENCE_MEDIUM || '0.60'),
};

// Max allowed image size: 10MB
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

class EcoVisionService {
  constructor() {
    this.thresholds = CONFIDENCE_THRESHOLDS;
    this.primaryProvider = roboflowVisionProvider;
    this.fallbackProvider = fallbackVisionProvider;
  }

  /**
   * Validate image buffer and MIME type before processing
   * @param {Buffer} imageBuffer
   * @param {string} [mimetype='image/jpeg']
   */
  validateImage(imageBuffer, mimetype = 'image/jpeg') {
    if (!imageBuffer || imageBuffer.length === 0) {
      return { valid: false, error: 'Empty image buffer provided' };
    }
    if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: `Image exceeds maximum allowed size of 10MB (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)` };
    }
    if (mimetype && !ALLOWED_MIME_TYPES.has(mimetype.toLowerCase())) {
      return { valid: false, error: `Unsupported image format '${mimetype}'. Allowed: JPEG, PNG, WebP` };
    }
    return { valid: true };
  }

  /**
   * Determine confidence level based on configurable thresholds
   * @param {number} confidence (0.0 to 1.0)
   * @returns {'HIGH' | 'MEDIUM' | 'LOW'}
   */
  getConfidenceLevel(confidence) {
    if (confidence >= this.thresholds.HIGH) return 'HIGH';
    if (confidence >= this.thresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Run Eco-Vision analysis on an image
   * @param {Buffer} imageBuffer - Uploaded image binary
   * @param {object} [options] - Optional params (mimetype, mockCategory for tests)
   * @returns {Promise<object>} Standardized EcoSetu vision analysis contract
   */
  async analyzeImage(imageBuffer, options = {}) {
    const validation = this.validateImage(imageBuffer, options.mimetype);
    if (!validation.valid) {
      return {
        success: false,
        errorType: 'INVALID_IMAGE',
        message: validation.error,
        analysis: null,
      };
    }

    let rawResult = null;

    // 1. Try primary provider (Roboflow) if configured
    if (this.primaryProvider.isConfigured() && !options.useFallbackOnly) {
      try {
        rawResult = await this.primaryProvider.analyze(imageBuffer, options);
      } catch (err) {
        logger.warn(`[EcoVisionService] Primary provider failed: ${err.message}. Falling back.`);
      }
    }

    // 2. Fallback if primary unconfigured, failed, or mock requested
    if (!rawResult || !rawResult.success) {
      rawResult = await this.fallbackProvider.analyze(imageBuffer, options);
    }

    return this.normalizeResult(rawResult);
  }

  /**
   * Normalize raw prediction into clean, standardized ECOSETU contract
   * @param {object} rawResult
   * @returns {object}
   */
  normalizeResult(rawResult) {
    if (!rawResult || !rawResult.success) {
      return {
        success: false,
        errorType: rawResult?.errorType || 'VISION_UNAVAILABLE',
        message: 'We couldn’t analyze this image right now. You can select the category manually.',
        analysis: null,
      };
    }

    const rawCategory = (rawResult.category || 'OTHER').toUpperCase();
    const category = EWASTE_CATEGORIES[rawCategory] ? rawCategory : 'OTHER';
    const confidence = parseFloat(Number(rawResult.confidence || 0).toFixed(4));
    const confidenceLevel = this.getConfidenceLevel(confidence);

    const detectedObjects = (rawResult.detectedObjects || []).map((obj) => ({
      label: obj.label || obj.category?.toLowerCase() || 'item',
      category: EWASTE_CATEGORIES[obj.category] ? obj.category : 'OTHER',
      confidence: parseFloat(Number(obj.confidence || confidence).toFixed(4)),
      bbox: obj.bbox || null,
    }));

    // Multi-object detection check: distinct categories found with >= MEDIUM confidence
    const distinctCategories = new Set(
      detectedObjects.filter((d) => d.confidence >= this.thresholds.MEDIUM).map((d) => d.category)
    );
    const isMultiObject = distinctCategories.size > 1;

    // Review required if low confidence or multiple items or OTHER category
    const reviewRequired = confidenceLevel === 'LOW' || isMultiObject || category === 'OTHER';

    let guidanceMessage = '';
    if (isMultiObject) {
      const itemsList = Array.from(distinctCategories).join(', ');
      guidanceMessage = `Multiple e-waste items detected (${itemsList}). Please confirm the primary item for this pickup.`;
    } else if (confidenceLevel === 'HIGH') {
      guidanceMessage = `Detected: ${category} (${Math.round(confidence * 100)}% confidence). Please confirm or choose manually.`;
    } else if (confidenceLevel === 'MEDIUM') {
      guidanceMessage = `Likely: ${category} (${Math.round(confidence * 100)}% confidence). Please verify before submitting.`;
    } else {
      guidanceMessage = 'Eco-Saathi couldn’t confidently identify this item. Please select its category manually.';
    }

    return {
      success: true,
      analysis: {
        category,
        confidence,
        confidenceLevel,
        reviewRequired,
        isMultiObject,
        isLowConfidence: confidenceLevel === 'LOW',
        detectedObjects,
        distinctCategories: Array.from(distinctCategories),
        guidance: guidanceMessage,
        guidanceMessage,
        condition: 'UNKNOWN', // Condition is not fabricated; collected from user
        modelVersion: rawResult.modelVersion || 'ecovision-v1.0',
        inferenceTimeMs: rawResult.inferenceTimeMs || 0,
      },
    };
  }
}

module.exports = new EcoVisionService();
