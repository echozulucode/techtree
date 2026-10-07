'use client';
// Reference host component: how a React 19 / Next.js App Router page embeds the
// capability map with the 0.2 accessibility options — no DOM patching, no
// CSS overrides for contrast / targets / dimming, no sr-only heading. Map your
// design tokens in CSS (see host-theme.css next to this file).
import type { IR } from '@echozedlabs/techtree-ir';
import { CAPABILITY_LINK_RELATIONS } from '@echozedlabs/techtree-schema/capability-data';
import type { NodeStates } from '@echozedlabs/techtree-state/status-model';
import {
  NodeDetail,
  TechTreeView,
  type ColorScheme,
  type NodeDetailContext,
  type TechTreeLinkRef,
} from '@echozedlabs/techtree-viewer';

export interface CapabilityMapHostProps {
  ir: IR;
  states: NodeStates;
  /** Resolved host theme ('system' during SSR / hydration is fine). */
  colorScheme: ColorScheme;
  /** Host items the reader may see, by slug (anything else is withheld). */
  examples: Readonly<Record<string, { title: string; href: string }>>;
  selectedId?: string | null;
  onSelectNode?: (id: string | null) => void;
}

/** Relations a host offers in its own link editor (zod-free import). */
export const LINK_RELATIONS = CAPABILITY_LINK_RELATIONS;

export function CapabilityMapHost({ ir, states, colorScheme, examples, selectedId, onSelectNode }: CapabilityMapHostProps) {
  return (
    <TechTreeView
      ir={ir}
      state={states}
      theme="css-variables"
      colorScheme={colorScheme}
      ariaLabel={`${ir.tree.title} capability map`}
      // The page has an h1: the drawer title and outline branches become h2.
      headingLevel={2}
      // Phones: start on the frontier at a readable zoom; the fit button and
      // larger screens never go below 35 %.
      initialFocus="frontier"
      initialZoom={0.8}
      fitViewOptions={{ minZoom: 0.35 }}
      {...(selectedId !== undefined ? { selectedId } : {})}
      {...(onSelectNode ? { onSelectNode } : {})}
      renderLink={(link: TechTreeLinkRef) => {
        // Withheld (not shown, not counted): anything but an example the reader may see.
        if (link.source !== 'link' || link.type !== 'example') return null;
        const ex = examples[link.ref];
        return ex ? <a href={ex.href}>{ex.title}</a> : null;
      }}
      renderNodeDetail={(ctx: NodeDetailContext) => (
        <>
          <NodeDetail ctx={ctx} />
          <p className="host-drawer-foot">
            <a href={`/tree/${encodeURIComponent(ctx.node.id)}`}>Open the full card</a>
          </p>
        </>
      )}
    />
  );
}
