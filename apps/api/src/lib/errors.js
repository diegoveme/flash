/**
 * Errors that cross the application boundary. The HTTP layer maps each one
 * to its status and code; anything else becomes a generic 500.
 */
export class AppError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {{ fields?: Record<string, string>, cause?: unknown }} [options]
   */
  constructor(status, code, message, { fields, cause } = {}) {
    super(message, { cause });
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input.', fields) {
    super(400, 'VALIDATION_ERROR', message, { fields });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Sign in to continue.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do this.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Already exists.', fields) {
    super(409, 'CONFLICT', message, { fields });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large.') {
    super(413, 'PAYLOAD_TOO_LARGE', message);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Unsupported media type.') {
    super(415, 'UNSUPPORTED_MEDIA_TYPE', message);
  }
}
