import type { Profile } from '../profile.js';
import { skillProfile } from './skill.js';
import { deliveryProfile } from './delivery.js';

/** Built-in profiles, keyed by id. The CLI's `--profile` flag selects among these. */
export const PROFILES: Record<string, Profile> = {
  skill: skillProfile,
  delivery: deliveryProfile,
};

export const DEFAULT_PROFILE_ID = 'skill';

export function getProfile(id: string): Profile | undefined {
  return PROFILES[id];
}

export { skillProfile, deliveryProfile };
