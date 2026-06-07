import { z } from 'zod';

export const TREE_SCHEMA_VERSION = 1 as const;

const eraDef = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    order: z.number().int(),
  })
  .strict();

const pathDef = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

/**
 * Optional id-namespace declared by a tree. When present, the linter warns
 * if any skill defined in the tree has an id that doesn't start with this
 * namespace. Use a dotted lowercase identifier (one or more segments).
 * Skipping the field opts out of the check (cross-tree skill sharing).
 */
const namespacePattern = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/;

export const treeSchema = z
  .object({
    schema_version: z.literal(TREE_SCHEMA_VERSION).optional(),
    tree: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        version: z.string().optional(),
        description: z.string().optional(),
        owners: z.array(z.string().min(1)).optional(),
        effective_date: z.string().optional(),
        default_theme: z.string().optional(),
        namespace: z
          .string()
          .regex(
            namespacePattern,
            'namespace must be a lowercase dotted identifier (e.g., "personal" or "org.eng").',
          )
          .optional(),
      })
      .strict(),
    imports: z.array(z.string().min(1)).optional(),
    eras: z.array(eraDef).optional(),
    paths: z.array(pathDef).optional(),
  })
  .strict();

export type Tree = z.infer<typeof treeSchema>;
export type EraDef = z.infer<typeof eraDef>;
export type PathDef = z.infer<typeof pathDef>;
