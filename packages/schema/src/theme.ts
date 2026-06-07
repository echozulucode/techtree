import { z } from 'zod';

export const THEME_SCHEMA_VERSION = 1 as const;

const colorRef = z.string().min(1); // CSS color value or token ref. Validated at render time.

const categoryStyle = z
  .object({
    shape: z.enum(['rect', 'rounded', 'hex', 'circle', 'diamond']).optional(),
    fill: colorRef.optional(),
    border: colorRef.optional(),
    elevation: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict();

const edgeStyle = z
  .object({
    stroke: colorRef.optional(),
    width: z.number().positive().optional(),
    style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  })
  .strict();

export const themeSchema = z
  .object({
    schema_version: z.literal(THEME_SCHEMA_VERSION).optional(),
    id: z.string().min(1),
    title: z.string().optional(),
    inherits: z.string().optional(),

    colors: z
      .object({
        canvas_background: colorRef.optional(),
        canvas_grid: colorRef.optional(),
        node_default_fill: colorRef.optional(),
        node_default_border: colorRef.optional(),
        node_text: colorRef.optional(),
        node_locked_fill: colorRef.optional(),
        node_available_fill: colorRef.optional(),
        node_in_progress_fill: colorRef.optional(),
        node_submitted_fill: colorRef.optional(),
        node_pending_approval_fill: colorRef.optional(),
        node_achieved_fill: colorRef.optional(),
        node_rejected_fill: colorRef.optional(),
        edge_requires: colorRef.optional(),
        edge_recommends: colorRef.optional(),
        edge_highlight: colorRef.optional(),
      })
      .strict()
      .optional(),

    categories: z.record(z.string(), categoryStyle).optional(),

    edges: z
      .object({
        requires: edgeStyle.optional(),
        recommends: edgeStyle.optional(),
      })
      .strict()
      .optional(),

    eras: z
      .object({
        show_labels: z.boolean().optional(),
        row_height: z.number().positive().optional(),
        label_color: colorRef.optional(),
      })
      .strict()
      .optional(),

    fonts: z
      .object({
        family: z.string().optional(),
        title_size: z.number().positive().optional(),
        body_size: z.number().positive().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type Theme = z.infer<typeof themeSchema>;
