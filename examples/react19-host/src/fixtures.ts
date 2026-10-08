import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IR } from '@echozedlabs/techtree-ir';
import type { TreeState } from '@echozedlabs/techtree-state';

// The committed demo IR + fictional demo state (same files the viewer SPA serves).
const publicIr = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'packages', 'viewer', 'public', 'ir');
export const ir = JSON.parse(readFileSync(join(publicIr, 'engineering-platform.ir.json'), 'utf8')) as IR;
export const demoState = JSON.parse(
  readFileSync(join(publicIr, 'engineering-platform.state.json'), 'utf8'),
) as TreeState;

export const SAU = 'eng.platform/safe-automatic-update';
export const CI = 'eng.platform/continuous-integration';
export const PUSH_BUTTON = 'eng.platform/push-button-release';
