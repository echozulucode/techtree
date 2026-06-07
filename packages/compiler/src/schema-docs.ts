import { z } from 'zod';
import { skillSchema, themeSchema, treeSchema, SCHEMA_VERSION } from '@echozedlabs/techtree-schema';

/**
 * Walk a Zod schema and emit a markdown reference doc. Uses the public Zod API
 * (instanceof checks against the exported Zod*  classes) — no internal `_def`
 * spelunking, so it survives minor Zod version bumps.
 *
 * Output is single-page markdown with one section per top-level schema (skill,
 * theme, tree). Nested object schemas are inlined as sub-tables one level deep;
 * deeper nesting describes the type briefly (e.g., "object<…>").
 */
export function generateSchemaDocs(): string {
  const date = new Date().toISOString().slice(0, 10);
  const out: string[] = [];
  out.push(`# Skill Tree — Schema Reference`);
  out.push('');
  out.push(`> Generated from \`@echozedlabs/techtree-schema\` v${SCHEMA_VERSION} on ${date}.`);
  out.push(`> Re-run \`skilltree schema docs --out <path>\` after any schema change.`);
  out.push('');
  out.push(`## Contents`);
  out.push('');
  out.push(`- [Skill (\`*.skill.yaml\`)](#skill)`);
  out.push(`- [Theme (\`*.theme.yaml\`)](#theme)`);
  out.push(`- [Tree (\`tree.yaml\`)](#tree)`);
  out.push('');

  out.push(`## Skill`);
  out.push('');
  out.push(`One skill per file (\`*.skill.yaml\` or \`*.skill.yml\`).`);
  out.push('');
  appendObjectTable(out, skillSchema, 'skill');

  out.push('');
  out.push(`## Theme`);
  out.push('');
  out.push(`One theme per file (\`*.theme.yaml\` or \`*.theme.yml\`).`);
  out.push('');
  appendObjectTable(out, themeSchema, 'theme');

  out.push('');
  out.push(`## Tree`);
  out.push('');
  out.push(
    `Tree-level metadata (\`tree.yaml\` or \`tree.yml\`). Optional — the compiler synthesizes a default tree from the directory name if missing.`,
  );
  out.push('');
  appendObjectTable(out, treeSchema, 'tree');

  out.push('');
  return out.join('\n');
}

function appendObjectTable(
  out: string[],
  schema: z.ZodTypeAny,
  sectionId: string,
  depth = 0,
): void {
  const obj = unwrap(schema);
  if (!(obj instanceof z.ZodObject)) {
    out.push(`*(not a structured object schema)*`);
    return;
  }

  const shape = obj.shape as Record<string, z.ZodTypeAny>;
  const indent = depth === 0 ? '' : '  '.repeat(depth);
  out.push(`${indent}| Field | Type | Required | Notes |`);
  out.push(`${indent}|---|---|---|---|`);

  // Collect nested-object fields for after the main table.
  const nested: { name: string; schema: z.ZodTypeAny }[] = [];

  for (const [name, fieldSchema] of Object.entries(shape)) {
    const required = !isOptional(fieldSchema);
    const inner = unwrap(fieldSchema);
    const typeStr = describeType(inner);
    const notes = describeNotes(inner, name);
    out.push(`${indent}| \`${name}\` | ${typeStr} | ${required ? 'yes' : 'no'} | ${notes} |`);

    if (inner instanceof z.ZodObject) {
      nested.push({ name, schema: inner });
    } else if (inner instanceof z.ZodArray && inner.element instanceof z.ZodObject) {
      nested.push({ name: `${name}[]`, schema: inner.element });
    }
  }

  for (const { name, schema: sub } of nested) {
    out.push('');
    out.push(`${indent}#### \`${name}\` (${sectionId}.${name})`);
    out.push('');
    appendObjectTable(out, sub, `${sectionId}-${name.replace(/[^\w]/g, '-')}`, depth);
  }
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let cur = schema;
  // Strip ZodOptional / ZodDefault / ZodNullable wrappers. Each has a different
  // unwrap accessor in Zod v3.
  while (true) {
    if (cur instanceof z.ZodOptional || cur instanceof z.ZodNullable) {
      cur = cur.unwrap();
    } else if (cur instanceof z.ZodDefault) {
      cur = cur.removeDefault();
    } else {
      break;
    }
  }
  return cur;
}

function isOptional(schema: z.ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
}

function describeType(s: z.ZodTypeAny): string {
  if (s instanceof z.ZodString) return 'string';
  if (s instanceof z.ZodNumber) return 'number';
  if (s instanceof z.ZodBoolean) return 'boolean';
  if (s instanceof z.ZodLiteral) return `\`${JSON.stringify(s.value)}\``;
  if (s instanceof z.ZodEnum) return s.options.map((o: string) => `\`${o}\``).join(' \\| ');
  if (s instanceof z.ZodArray) return `${describeType(s.element)}[]`;
  if (s instanceof z.ZodObject) return 'object (see below)';
  if (s instanceof z.ZodRecord) {
    // `valueSchema` is the public accessor in Zod v3.
    const valueType = s as unknown as {
      valueSchema?: z.ZodTypeAny;
      _def?: { valueType?: z.ZodTypeAny };
    };
    const inner = valueType.valueSchema ?? valueType._def?.valueType;
    return inner ? `record&lt;string, ${describeType(inner)}&gt;` : 'record';
  }
  if (s instanceof z.ZodUnion) {
    const opts = (s as z.ZodUnion<readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>)
      .options as readonly z.ZodTypeAny[];
    return opts.map((o) => describeType(o)).join(' \\| ');
  }
  return 'unknown';
}

function describeNotes(s: z.ZodTypeAny, fieldName: string): string {
  const notes: string[] = [];
  if (s instanceof z.ZodNumber) {
    // Zod ZodNumber stores constraints on _def.checks but the API is via instance methods.
    // Heuristic: peek at _def.checks for min/max/int — minor private-API touch, kept narrow.
    const checks = (s._def as { checks?: { kind: string; value?: number }[] }).checks ?? [];
    const min = checks.find((c) => c.kind === 'min')?.value;
    const max = checks.find((c) => c.kind === 'max')?.value;
    const isInt = checks.some((c) => c.kind === 'int');
    if (isInt) notes.push('integer');
    if (min !== undefined && max !== undefined) notes.push(`range ${min}–${max}`);
    else if (min !== undefined) notes.push(`min ${min}`);
    else if (max !== undefined) notes.push(`max ${max}`);
  }
  if (s instanceof z.ZodString) {
    const checks = (s._def as { checks?: { kind: string; regex?: RegExp }[] }).checks ?? [];
    if (checks.some((c) => c.kind === 'url')) notes.push('URL');
    if (checks.some((c) => c.kind === 'regex')) notes.push('format-validated');
    if (checks.some((c) => c.kind === 'min')) notes.push('non-empty');
  }
  // Field-specific human notes captured below (small lookup table).
  const annotation = FIELD_NOTES[fieldName];
  if (annotation) notes.push(annotation);
  return notes.join('; ');
}

/**
 * Field-specific notes that aren't expressible in Zod constraints alone.
 * Kept as a small curated table so the doc reads well; if Zod's `.describe()`
 * is added to schemas later, replace this with `_def.description`.
 */
const FIELD_NOTES: Record<string, string> = {
  id: 'namespaced lowercase identifier (e.g., `org.eng/some-skill`)',
  aliases: 'historical IDs that still resolve to this skill',
  era: 'matches an era in `tree.yaml` if eras are declared',
  path: 'named progression for focus-on-load (Phase 3)',
  requires: 'hard prerequisites — block availability until achieved',
  recommends: 'soft follow-ons — render as dashed edges',
  difficulty: 'displayed as filled dots (●) in the node',
  owner: 'workflow metadata (descriptive in MVP, enforced from §8 phase 6+)',
  approver_role: 'who can transition `submitted` → `achieved` (Phase 5+)',
  default_theme: 'auto-applied on first load unless `?theme=` URL param overrides',
};
