import {
  BookOpen,
  Layers,
  Mountain,
  Wrench,
  Code2,
  PenTool,
  Sparkles,
  Palette,
  Package,
  GitBranch,
  Users,
  Server,
  Circle,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  foundations: BookOpen,
  core: Layers,
  advanced: Mountain,
  tools: Wrench,
  programming: Code2,
  writing: PenTool,
  skills: Sparkles,
  design: Palette,
  delivery: Package,
  process: GitBranch,
  leadership: Users,
  operations: Server,
};

export function iconFor(category?: string): LucideIcon {
  return CATEGORY_ICON[category ?? ''] ?? Circle;
}

export function difficultyPips(d?: number, max = 5): string {
  if (!d) return '';
  const filled = Math.min(max, Math.max(0, Math.round(d)));
  return '●'.repeat(filled) + '○'.repeat(max - filled);
}
