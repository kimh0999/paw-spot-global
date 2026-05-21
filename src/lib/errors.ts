export const ErrorCode = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  DUPLICATE_REVIEW: "DUPLICATE_REVIEW",
  TOUR_API_ERROR: "TOUR_API_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  DUPLICATE_REVIEW: 409,
  TOUR_API_ERROR: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_REQUIRED: "Authentication required",
  FORBIDDEN: "You do not have permission to perform this action",
  NOT_FOUND: "Resource not found",
  VALIDATION_FAILED: "Validation failed",
  DUPLICATE_REVIEW: "You have already submitted a review for this place",
  TOUR_API_ERROR: "Failed to fetch data from TourAPI",
  RATE_LIMITED: "Too many requests, please try again later",
  INTERNAL_ERROR: "An unexpected error occurred",
};

export interface AppError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
}

export function createAppError(
  code: ErrorCode,
  message?: string,
  details?: unknown,
): AppError {
  return {
    code,
    message: message ?? DEFAULT_ERROR_MESSAGES[code],
    statusCode: ERROR_STATUS_MAP[code],
    details,
  };
}

// Type-only sanity checks
const _errorCheck: AppError = createAppError("NOT_FOUND");
void _errorCheck;
