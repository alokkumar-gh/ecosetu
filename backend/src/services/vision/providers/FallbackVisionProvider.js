/**
 * EcoSetu — Fallback / Heuristic Vision Provider
 * Reliable fallback provider for testing, mock environments, or offline keyless mode.
 */

const VisionProvider = require('../VisionProvider');
const { EWASTE_CATEGORIES } = require('../../../utils/constants');

class FallbackVisionProvider extends VisionProvider {
  constructor() {
    super('fallback');
  }

  isConfigured() {
    return true; // Always available as graceful safety net
  }

  async analyze(imageBuffer, options = {}) {
    if (!imageBuffer || imageBuffer.length === 0) {
      return { success: false, errorType: 'INVALID_IMAGE', message: 'Empty image buffer' };
    }

    // Heuristic: If mockObjects array provided (for testing multi-object detection)
    if (options.mockObjects && Array.isArray(options.mockObjects)) {
      const detectedObjects = options.mockObjects.map((d) => {
        const rawCat = (d.label || d.category || 'OTHER').toUpperCase().replace(/[\s\-]/g, '_');
        const cat = EWASTE_CATEGORIES[rawCat] ? rawCat : (rawCat.includes('LAPTOP') ? 'LAPTOP' : rawCat.includes('PHONE') || rawCat.includes('MOBILE') ? 'MOBILE_PHONE' : rawCat.includes('CABLE') || rawCat.includes('CHARGER') ? 'CABLE_CHARGER' : 'OTHER');
        return {
          label: d.label || cat.toLowerCase(),
          category: cat,
          confidence: d.confidence !== undefined ? d.confidence : 0.85,
          bbox: d.bbox || { x: 100, y: 100, width: 200, height: 200 },
        };
      });
      const top = detectedObjects[0] || { category: 'OTHER', confidence: 0.5 };
      return {
        success: true,
        category: top.category,
        confidence: top.confidence,
        detectedObjects,
        modelVersion: 'fallback-heuristic-v1.0',
        inferenceTimeMs: 15,
      };
    }

    // Heuristic: If mock category requested in options (for testing), return it
    if (options.mockCategory && EWASTE_CATEGORIES[options.mockCategory]) {
      const conf = options.mockConfidence !== undefined ? options.mockConfidence : 0.92;
      const cat = options.mockCategory;
      const detectedObjects = (options.mockDetections || [{ label: cat.toLowerCase(), category: cat, confidence: conf }]).map((d) => ({
        label: d.label,
        category: d.category,
        confidence: d.confidence,
        bbox: d.bbox || { x: 100, y: 100, width: 200, height: 200 },
      }));

      return {
        success: true,
        category: cat,
        confidence: conf,
        detectedObjects,
        modelVersion: 'fallback-heuristic-v1.0',
        inferenceTimeMs: 15,
      };
    }

    // Default safe fallback when image cannot be resolved automatically
    return {
      success: true,
      category: 'OTHER',
      confidence: 0.35,
      detectedObjects: [],
      modelVersion: 'fallback-heuristic-v1.0',
      inferenceTimeMs: 10,
    };
  }
}

module.exports = new FallbackVisionProvider();
