/**
 * EcoSetu Mobile AppError
 * Centralized error model for network, auth, validation, and sync errors.
 * Source of Truth: docs/05_API_SPECIFICATION.md, docs/24_ERROR_EDGE_CASES.md
 */

export class AppError extends Error {
  constructor({
    message = 'An unexpected error occurred',
    code = 'UNKNOWN_ERROR',
    status = 500,
    details = null,
    isRetryable = false,
    isNetworkError = false,
    isAuthError = false,
  } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.isRetryable = isRetryable;
    this.isNetworkError = isNetworkError;
    this.isAuthError = isAuthError;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static networkError(message = 'Network request failed. Please check your connection.', originalError = null) {
    return new AppError({
      message,
      code: 'NETWORK_ERROR',
      status: 0,
      details: originalError ? { originalMessage: originalError.message } : null,
      isRetryable: true,
      isNetworkError: true,
      isAuthError: false,
    });
  }

  static timeoutError(message = 'Request timed out. Please try again.') {
    return new AppError({
      message,
      code: 'TIMEOUT_ERROR',
      status: 408,
      isRetryable: true,
      isNetworkError: true,
      isAuthError: false,
    });
  }

  static authError(message = 'Authentication required. Please log in again.', code = 'UNAUTHORIZED', status = 401) {
    return new AppError({
      message,
      code,
      status,
      isRetryable: false,
      isNetworkError: false,
      isAuthError: true,
    });
  }

  static validationError(message = 'Validation failed', details = null) {
    return new AppError({
      message,
      code: 'VALIDATION_ERROR',
      status: 400,
      details,
      isRetryable: false,
      isNetworkError: false,
      isAuthError: false,
    });
  }

  static forbiddenError(message = 'Access denied. You do not have permission for this action.') {
    return new AppError({
      message,
      code: 'FORBIDDEN',
      status: 403,
      isRetryable: false,
      isNetworkError: false,
      isAuthError: false,
    });
  }

  static notFoundError(message = 'Resource not found') {
    return new AppError({
      message,
      code: 'NOT_FOUND',
      status: 404,
      isRetryable: false,
      isNetworkError: false,
      isAuthError: false,
    });
  }

  static conflictError(message = 'A conflict occurred with the current state of the resource.') {
    return new AppError({
      message,
      code: 'CONFLICT',
      status: 409,
      isRetryable: false,
      isNetworkError: false,
      isAuthError: false,
    });
  }

  static serverError(message = 'Internal server error', status = 500) {
    // 502, 503, 504 are retryable transient server errors
    const isRetryable = status === 502 || status === 503 || status === 504;
    return new AppError({
      message,
      code: 'INTERNAL_ERROR',
      status,
      isRetryable,
      isNetworkError: false,
      isAuthError: false,
    });
  }

  static fromResponse(data, status) {
    const errorData = data?.error || {};
    const code = errorData.code || 'UNKNOWN_ERROR';
    const message = errorData.message || data?.message || `HTTP error ${status}`;
    const details = errorData.details || null;

    if (status === 401) {
      return AppError.authError(message, code, status);
    }
    if (status === 403) {
      return AppError.forbiddenError(message);
    }
    if (status === 400) {
      return AppError.validationError(message, details);
    }
    if (status === 404) {
      return AppError.notFoundError(message);
    }
    if (status === 409) {
      return AppError.conflictError(message);
    }
    if (status >= 500) {
      return AppError.serverError(message, status);
    }

    return new AppError({
      message,
      code,
      status,
      details,
      isRetryable: status >= 500,
      isNetworkError: false,
      isAuthError: status === 401,
    });
  }
}
