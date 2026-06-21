export class AuthzError extends Error {
  constructor(
    public readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN',
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'AuthzError'
  }
}

export type ValidationCode =
  | 'DUPLICATE_EMAIL'
  | 'WRONG_PASSWORD'
  | 'LAST_ADMIN'
  | 'SELF_ACTION'
  | 'INVALID_AVATAR'
  | 'INVALID_INPUT'

/** A recoverable, user-facing validation/guardrail failure (mapped to a friendly message). */
export class ValidationError extends Error {
  constructor(
    public readonly code: ValidationCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ValidationError'
  }
}
