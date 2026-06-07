/**
 * Token-in-header auth, deliberately minimal for the Phase 5 preview.
 *
 * Two roles only:
 *  - `author`  — read any state; transition any skill (submitted→achieved/rejected).
 *  - `learner` — read & write own state; cannot approve.
 *
 * Real OIDC, RBAC matrix, multi-tenancy, etc. all live in the post-MVP phases
 * (see the "Still missing for true enterprise" ADR — task #6 of Phase 5).
 */

export type Role = 'author' | 'learner';

export interface Principal {
  user_id: string;
  role: Role;
}

export interface AuthConfig {
  /** Map of opaque token → principal. Loaded at server startup; not hot-reloadable. */
  tokens: Map<string, Principal>;
}

/**
 * Parse a TOKENS env var or config object into an AuthConfig.
 * Format: `token1:role:user_id,token2:role:user_id` (comma-separated, colon-delimited).
 *
 * Example: `secret-author-1:author:alice,secret-learner-1:learner:bob`
 */
export function parseTokenString(raw: string): AuthConfig {
  const tokens = new Map<string, Principal>();
  for (const entry of raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const parts = entry.split(':');
    if (parts.length !== 3) {
      throw new Error(`invalid TOKENS entry "${entry}" — expected token:role:user_id`);
    }
    const [token, role, user_id] = parts as [string, string, string];
    if (role !== 'author' && role !== 'learner') {
      throw new Error(
        `invalid role "${role}" in TOKENS entry "${entry}" — expected author or learner`,
      );
    }
    tokens.set(token, { user_id, role });
  }
  return { tokens };
}

/** Resolve a bearer/raw token from a request's Authorization header. */
export function tokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) return trimmed.slice(7).trim();
  return trimmed;
}
