// EcoSetu Roboflow Hosted Inference Service Adapter (v43 Model)
// Canonical Reference: docs/ECOSETU_AI_ROBOFLOW_STEP1_EVALUATION_REPORT.md, docs/05_API_SPECIFICATION.md Section 11

const environment = require('../config/environment');
const logger = require('../config/logger');
const {
  PRIORITY_TIERS,
  ROBOFLOW_CLASS_MAP,
  mapRoboflowClass,
  prioritizeDetections,
} = require('./roboflowTaxonomyMapper');
const { EWASTE_CATEGORIES } = require('../utils/constants');

class RoboflowService {
  constructor() {
    this.modelId = environment.roboflowModelId || 'e-waste-dataset-r0ojc/43';
    this.apiKey = environment.roboflowApiKey || process.env.ROBOFLOW_API_KEY || '';
    this.modelVersion = 'roboflow-e-waste-dataset-r0ojc-43';
    this.timeoutMs = parseInt(process.env.ROBOFLOW_TIMEOUT_MS, 10) || 15000;
  }

  /**
   * Safely sanitize any string or error message to ensure API keys are NEVER exposed in logs or errors.
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string with API key redacted
   */
  _sanitize(str) {
    if (!str || typeof str !== 'string') return '';
    const key = this.apiKey || process.env.ROBOFLOW_API_KEY;
    if (key && key.length > 3) {
      return str.split(key).join('[REDACTED_API_KEY]');
    }
    return str;
  }

  /**
   * Verify if the service is properly configured with an API key.
   * @returns {boolean} True if API key is present
   */
  isConfigured() {
    const key = this.apiKey || process.env.ROBOFLOW_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Parse and normalize raw Roboflow predictions into clean internal representations.
   * Calculates relative and pixel bounding boxes and resolves EcoSetu taxonomy mappings.
   * @param {Array<object>} rawPredictions - Predictions array from Roboflow inference response
   * @param {object} imageMeta - Image metadata { width, height }
   * @returns {Array<object>} Normalized detection items
   */
  normalizeDetections(rawPredictions = [], imageMeta = {}) {
    if (!Array.isArray(rawPredictions)) {
      return [];
    }

    const imgWidth = imageMeta.width || 1;
    const imgHeight = imageMeta.height || 1;

    return rawPredictions.map((pred, index) => {
      const rawClass = pred.class || pred.className || 'Unknown';
      const confidence = typeof pred.confidence === 'number' 
        ? Math.round(pred.confidence * 1000) / 1000 
        : 0;

      const mapping = mapRoboflowClass(rawClass);

      // Roboflow provides center coordinates (x, y) and dimensions (width, height) in pixels
      const cx = typeof pred.x === 'number' ? pred.x : 0;
      const cy = typeof pred.y === 'number' ? pred.y : 0;
      const w = typeof pred.width === 'number' ? pred.width : 0;
      const h = typeof pred.height === 'number' ? pred.height : 0;

      // Compute relative normalized coordinates (0.0 to 1.0)
      const x_min = Math.max(0, Math.min(1, Math.round(((cx - w / 2) / imgWidth) * 1000) / 1000));
      const y_min = Math.max(0, Math.min(1, Math.round(((cy - h / 2) / imgHeight) * 1000) / 1000));
      const x_max = Math.max(0, Math.min(1, Math.round(((cx + w / 2) / imgWidth) * 1000) / 1000));
      const y_max = Math.max(0, Math.min(1, Math.round(((cy + h / 2) / imgHeight) * 1000) / 1000));

      return {
        id: pred.detection_id || `det_${index}`,
        className: rawClass,
        category: mapping.category,
        confidence,
        tier: mapping.tier,
        status: mapping.status,
        description: mapping.description,
        bbox: {
          x: cx,
          y: cy,
          width: w,
          height: h,
          x_min,
          y_min,
          x_max,
          y_max,
        },
      };
    });
  }

  /**
   * Send image to Roboflow Hosted Inference API and normalize result into EcoSetu prediction contract.
   * @param {Buffer} imageBuffer - Uploaded image binary buffer
   * @param {object} options - Optional parameters { confidenceThreshold, overlapThreshold }
   * @returns {Promise<object|null>} Standardized EcoSetu prediction object or null on failure
   */
  async predict(imageBuffer, options = {}) {
    if (!imageBuffer || imageBuffer.length === 0) {
      console.warn('[EcoSetu AI DEBUG] RoboflowService: Empty image buffer provided');
      return null;
    }

    const apiKey = this.apiKey || process.env.ROBOFLOW_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      logger.error('[EcoSetu AI] Roboflow API key is missing or unconfigured in environment (ROBOFLOW_API_KEY)');
      console.warn('[EcoSetu AI DEBUG] RoboflowService: ROBOFLOW_API_KEY is missing');
      return null;
    }

    const confidenceThresh = options.confidenceThreshold || 40; // 40%
    const overlapThresh = options.overlapThreshold || 30; // 30%
    const modelId = this.modelId;

    // Roboflow hosted inference endpoint
    const endpoint = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}&confidence=${confidenceThresh}&overlap=${overlapThresh}`;
    const sanitizedUrl = endpoint.replace(apiKey, '[REDACTED_API_KEY]');

    console.log(`[EcoSetu AI DEBUG] RoboflowService: Dispatching inference to ${sanitizedUrl}, payload: ${imageBuffer.length} bytes`);

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: base64Image,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsedMs = Date.now() - startTime;
      console.log(`[EcoSetu AI DEBUG] RoboflowService: HTTP status: ${response.status}, latency: ${elapsedMs}ms`);

      if (!response.ok) {
        let errBody = '';
        try {
          errBody = await response.text();
        } catch (_) {}
        const safeError = this._sanitize(errBody);
        logger.warn(`[EcoSetu AI] Roboflow API error HTTP ${response.status}: ${safeError}`);
        console.warn(`[EcoSetu AI DEBUG] Roboflow HTTP error ${response.status}: ${safeError}`);
        return null;
      }

      const rawData = await response.json();
      const inferenceTimeMs = rawData.time ? Math.round(rawData.time * 1000) : elapsedMs;

      // Handle malformed response structures
      if (!rawData || !Array.isArray(rawData.predictions)) {
        logger.warn('[EcoSetu AI] Roboflow returned unexpected payload structure');
        return null;
      }

      const normalizedDetections = this.normalizeDetections(rawData.predictions, rawData.image || {});

      // ── Phase 5: Zero-detection handling (Valid AI outcome, NOT service error) ──
      if (normalizedDetections.length === 0) {
        console.log('[EcoSetu AI DEBUG] RoboflowService: Zero detections returned (valid outcome -> OTHER, review_required)');
        return {
          success: true,
          has_detection: false,
          category: EWASTE_CATEGORIES.OTHER,
          confidence: 0.0,
          confidence_level: 'LOW',
          review_required: true,
          review_reason: 'NO_DETECTION',
          bbox: null,
          detections: [],
          allPredictions: [],
          modelVersion: this.modelVersion,
          inferenceTimeMs,
        };
      }

      // ── Phase 3: Prioritize detections deterministically ──
      const primary = prioritizeDetections(normalizedDetections);
      const primaryConfidence = primary.confidence || 0.0;

      // Compute confidence level
      let confidenceLevel = 'LOW';
      if (primaryConfidence >= 0.70) {
        confidenceLevel = 'HIGH';
      } else if (primaryConfidence >= 0.40) {
        confidenceLevel = 'MEDIUM';
      }

      // Determine if human review is required
      const isLowConfidence = primaryConfidence < 0.60;
      const isNeedsReview = primary.status === 'NEEDS_REVIEW';
      const isOtherCategory = primary.category === EWASTE_CATEGORIES.OTHER;

      const reviewRequired = isLowConfidence || isNeedsReview || isOtherCategory;
      let reviewReason = null;
      if (isNeedsReview) {
        reviewReason = 'UNCERTAIN_MAPPING';
      } else if (isLowConfidence) {
        reviewReason = 'LOW_CONFIDENCE';
      } else if (isOtherCategory) {
        reviewReason = 'UNCERTAIN_CATEGORY';
      }

      // Aggregate all distinct category predictions
      const categoryMap = new Map();
      for (const det of normalizedDetections) {
        const cat = det.category;
        const currentConf = categoryMap.get(cat) || 0;
        if (det.confidence > currentConf) {
          categoryMap.set(cat, det.confidence);
        }
      }

      const allPredictions = Array.from(categoryMap.entries()).map(([cat, conf]) => ({
        category: cat,
        confidence: conf,
      })).sort((a, b) => b.confidence - a.confidence);

      return {
        success: true,
        has_detection: true,
        category: primary.category,
        confidence: primaryConfidence,
        confidence_level: confidenceLevel,
        review_required: reviewRequired,
        review_reason: reviewReason,
        bbox: primary.bbox,
        detections: normalizedDetections.map((d) => ({
          className: d.className,
          category: d.category,
          confidence: d.confidence,
          tier: d.tier,
          status: d.status,
          bbox: d.bbox,
        })),
        allPredictions,
        modelVersion: this.modelVersion,
        inferenceTimeMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const safeMessage = this._sanitize(err.message);
      if (err.name === 'AbortError') {
        logger.warn(`[EcoSetu AI] Roboflow request timed out after ${this.timeoutMs / 1000}s`);
        console.warn(`[EcoSetu AI DEBUG] Roboflow request timed out after ${this.timeoutMs / 1000}s`);
      } else {
        logger.warn(`[EcoSetu AI] Roboflow inference unreachable/error: ${safeMessage}`);
        console.warn(`[EcoSetu AI DEBUG] Roboflow inference unreachable/error: ${safeMessage}`);
      }
      return null;
    }
  }
}

module.exports = new RoboflowService();
