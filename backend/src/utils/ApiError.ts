/**
 * Operational error carrying an HTTP status code and a stable machine readable code.
 * Anything thrown that is *not* an ApiError is treated as an unexpected error and
 * never leaks its message/stack to the client (TRD-12).
 */
export class ApiError extends Error {
  public readonly statusCode: number;

  public readonly code: string;

  public readonly details?: unknown;

  public readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
  }

  static badRequest(message = 'Invalid request.', code = 'BAD_REQUEST', details?: unknown) {
    return new ApiError(400, code, message, details);
  }

  static validation(message = 'Validation failed.', details?: unknown) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required.', code = 'UNAUTHORIZED', details?: unknown) {
    return new ApiError(401, code, message, details);
  }

  static forbidden(message = 'You do not have permission to perform this action.', details?: unknown) {
    return new ApiError(403, 'FORBIDDEN', message, details);
  }

  static notFound(message = 'Resource not found.', code = 'NOT_FOUND', details?: unknown) {
    return new ApiError(404, code, message, details);
  }

  static conflict(message = 'Resource conflict.', code = 'CONFLICT', details?: unknown) {
    return new ApiError(409, code, message, details);
  }

  static payloadTooLarge(message = 'Uploaded file is too large.', code = 'FILE_TOO_LARGE') {
    return new ApiError(413, code, message);
  }

  static unsupportedMedia(message = 'Unsupported file type.', code = 'UNSUPPORTED_MEDIA_TYPE') {
    return new ApiError(415, code, message);
  }

  static unprocessable(message = 'Request could not be processed.', code = 'UNPROCESSABLE', details?: unknown) {
    return new ApiError(422, code, message, details);
  }

  static internal(message = 'An unexpected error occurred.', code = 'INTERNAL_ERROR', details?: unknown) {
    return new ApiError(500, code, message, details);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable.', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, code, message);
  }
}
