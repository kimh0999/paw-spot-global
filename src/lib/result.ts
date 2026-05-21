import { createAppError, type AppError, type ErrorCode } from "./errors";

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(error: AppError): Result<never> {
  return { ok: false, error };
}

export function failWith(
  code: ErrorCode,
  message?: string,
  details?: unknown,
): Result<never> {
  return { ok: false, error: createAppError(code, message, details) };
}

// Type-only sanity checks
const _okCheck: Result<number> = ok(1);
const _failCheck: Result<never> = failWith("NOT_FOUND");
void _okCheck;
void _failCheck;
