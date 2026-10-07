import {
  AlertTriangle,
  Check,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Cog,
  Clock,
  Flag,
  Hourglass,
  Landmark,
  Lock,
  LockOpen,
  Search,
  Send,
  Star,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * The viewer's status icon set. Status models and themes name icons by these
 * keys (see STATUS_ICON_NAMES in @echozedlabs/techtree-state) so they stay data.
 */
export const STATUS_ICONS: Readonly<Record<string, LucideIcon>> = {
  lock: Lock,
  unlock: LockOpen,
  circle: Circle,
  'circle-dashed': CircleDashed,
  search: Search,
  'circle-half': CircleDot,
  'circle-check': CircleCheck,
  star: Star,
  'alert-triangle': AlertTriangle,
  'x-circle': XCircle,
  check: Check,
  clock: Clock,
  send: Send,
  hourglass: Hourglass,
  x: X,
};

export function statusIcon(name: string | undefined): LucideIcon | undefined {
  return name ? STATUS_ICONS[name] : undefined;
}

/** Icons for the capability profile's node kinds (also used by any profile with these categories). */
export const KIND_ICONS: Readonly<Record<string, LucideIcon>> = {
  capability: Cog,
  milestone: Flag,
  wonder: Landmark,
};
