import { z } from 'zod';

/**
 * Stable, namespaced skill identifier.
 *
 * Format: dotted-namespace, optional `/name` suffix.
 *   - `org.eng.platform/kubernetes-networking`
 *   - `personal.learning/git-foundations`
 *   - `smoke.hello-world`  (no slash; namespace + name in one segment)
 *
 * Lowercase letters, digits, and dashes within each segment. Must start with
 * a letter or digit. See docs/high-level-plan.md §1.2.
 */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+(\/[a-z0-9][a-z0-9-]*)?$/;

export const skillId = z
  .string()
  .regex(
    ID_PATTERN,
    'ID must be a lowercase namespaced identifier like "org.eng/kubernetes-basics" or "smoke.hello-world".',
  );

export type SkillId = z.infer<typeof skillId>;

export function isValidSkillId(s: string): boolean {
  return ID_PATTERN.test(s);
}
