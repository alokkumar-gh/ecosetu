// EcoSetu AI Endpoints Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 11, docs/11_AI_EWASTE_DETECTION.md, docs/13_SECURITY_PRIVACY.md

const { body } = require('express-validator');
const { EWASTE_CATEGORIES } = require('../utils/constants');

const VALID_CATEGORIES = Object.values(EWASTE_CATEGORIES);

const feedbackValidator = [
  body('predictionId')
    .exists({ checkNull: true })
    .withMessage('predictionId is required')
    .isUUID()
    .withMessage('predictionId must be a valid UUID'),

  body('wasAccepted')
    .exists({ checkNull: true })
    .withMessage('wasAccepted is required')
    .isBoolean()
    .withMessage('wasAccepted must be a boolean')
    .toBoolean(),

  body('correctedCategory')
    .custom((value, { req }) => {
      const wasAccepted = req.body.wasAccepted;
      if (wasAccepted === false || wasAccepted === 'false') {
        if (!value) {
          throw new Error('correctedCategory is required when wasAccepted is false');
        }
        if (!VALID_CATEGORIES.includes(value)) {
          throw new Error(`correctedCategory must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
      } else if (value && !VALID_CATEGORIES.includes(value)) {
        throw new Error(`correctedCategory must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      return true;
    }),
];

module.exports = {
  feedback: feedbackValidator,
};
