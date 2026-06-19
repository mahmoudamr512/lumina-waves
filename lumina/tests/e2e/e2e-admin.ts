/**
 * Shared, side-effect-free constants for the deterministic e2e admin.
 * Kept free of any Prisma import so it is safe to load from both the Playwright
 * CommonJS context (global-setup / spec) and the tsx ESM provisioning script.
 */
export const E2E_ADMIN_EMAIL = 'e2e-admin@luminawaves.com'
export const E2E_ADMIN_PASSWORD = 'e2e-password-123'
