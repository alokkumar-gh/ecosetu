/**
 * EcoSetu — Vision Provider Base Interface
 * Provider-independent abstraction for e-waste image classification and object detection.
 * Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/05_API_SPECIFICATION.md Section 11
 */

class VisionProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if this vision provider is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }

  /**
   * Run vision inference on an image buffer
   * @param {Buffer} imageBuffer
   * @param {object} [options]
   * @returns {Promise<object>} Standardized raw detection result
   */
  async analyze(imageBuffer, options = {}) {
    throw new Error('VisionProvider.analyze() must be implemented by subclass');
  }
}

module.exports = VisionProvider;
