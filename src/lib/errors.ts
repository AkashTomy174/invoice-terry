/**
 * Safely extract a human-readable message from a caught value.
 *
 * `catch` blocks receive `unknown` in strict TypeScript, not `Error` - a
 * thrown value can be any type at all. This narrows it instead of asserting
 * `catch (err: any)` everywhere (which was ESLint's single most common
 * complaint across the API routes).
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
