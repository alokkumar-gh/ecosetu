// EcoSetu Standard API Response Formatter
// Canonical Reference: docs/05_API_SPECIFICATION.md

/**
 * Send standard success response
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} statusCode
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Send standard error response
 * @param {import('express').Response} res
 * @param {string} code
 * @param {string} message
 * @param {number} statusCode
 * @param {any} details
 */
const sendError = (res, code, message, statusCode = 500, details = null) => {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== null && details !== undefined) {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};
