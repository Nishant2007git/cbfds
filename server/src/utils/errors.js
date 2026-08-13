export class AppError extends Error {
  constructor(message, statusCode, errorCode, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message, errorCode = 'AUTH_INVALID_CREDENTIALS', details = {}) {
    super(message, 401, errorCode, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied. Insufficient permissions.') {
    super(message, 403, 'AUTH_UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(message, errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message, errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Storage quota exceeded.', details = {}) {
    super(message, 413, 'QUOTA_EXCEEDED', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests.', details = {}) {
    super(message, 429, 'RATE_LIMITED', details);
  }
}

export class IntegrityError extends AppError {
  constructor(message = 'File integrity verification failed.', details = {}) {
    super(message, 500, 'FILE_INTEGRITY_FAILURE', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable.', details = {}) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}
