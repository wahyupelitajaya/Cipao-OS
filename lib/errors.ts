/**
 * Consistent error pattern for server actions and UI.
 * Use AppError so the UI can show user-friendly messages and never raw stack traces.
 */

export const ErrorCode = {
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DB_ERROR: "DB_ERROR",
} as const;

export type AppErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** User-facing message. Shown in UI. */
  readonly message: string;
  /** Optional details for server logs only. Never expose to client. */
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.message = message;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Type guard: is this error an AppError? */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * Get a user-friendly message from any thrown value.
 * Use this in UI only. Never show raw Error.message or stack to the user.
 */
export function getFriendlyMessage(err: unknown): string {
  if (isAppError(err)) {
    if (err.code === ErrorCode.NOT_AUTHENTICATED) {
      return "Session expired. Please log in again.";
    }
    if (err.code === ErrorCode.NOT_AUTHORIZED) {
      return "You don't have permission to do that.";
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}
