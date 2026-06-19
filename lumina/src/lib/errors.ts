export class AuthzError extends Error {
  constructor(
    public readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN',
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'AuthzError'
  }
}
