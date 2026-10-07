import type { ReactNode } from 'react';
import type { IRNode } from '@echozedlabs/techtree-ir';
import { CAPABILITY_LINK_RELATIONS } from '@echozedlabs/techtree-schema/capability-data';
import { statusDef } from '@echozedlabs/techtree-state/status-model';
import { KIND_ICONS, statusIcon } from '../shell/status-icons.js';
import { statusColor, statusIconName, statusLabel } from '../shell/status-style.js';
import type { HighlightDirection } from '../shell/graph.js';
import { headingTag } from './heading.js';
import type { HeadingLevel, NodeDetailContext, TechTreeLinkRef } from './types.js';

const RELATION_TITLES: Record<string, string> = {
  demonstrates: 'Demonstrated by',
  implements: 'Implemented by',
  evidence: 'Evidence',
  eureka: 'Eureka evidence',
};

const KIND_LABELS: Record<string, string> = {
  capability: 'Capability',
  milestone: 'Milestone',
  wonder: 'Wonder',
};

/** Parse an implementation ref: "technology:yocto-project" → {type, ref}. */
export function parseImplementationRef(raw: string): TechTreeLinkRef {
  const i = raw.indexOf(':');
  if (i > 0 && !raw.startsWith('http')) {
    return { type: raw.slice(0, i), ref: raw.slice(i + 1), relation: 'implements', source: 'implementation' };
  }
  return { type: 'implementation', ref: raw, relation: 'implements', source: 'implementation' };
}

function DefaultLink({ link }: { link: TechTreeLinkRef }) {
  if (link.type === 'url' && /^https?:\/\//.test(link.ref)) {
    return (
      <a href={link.ref} target="_blank" rel="noreferrer" className="tt-link">
        {link.ref}
      </a>
    );
  }
  return (
    <span className="tt-link-ref">
      {link.type === 'implementation' ? link.ref : `${link.type}: ${link.ref}`}
    </span>
  );
}

function Section({
  title,
  children,
  testId,
  level,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
  level: number;
}) {
  const H = headingTag(level);
  return (
    <section className="tt-section" data-testid={testId}>
      <H className="tt-section-title">{title}</H>
      {children}
    </section>
  );
}

function NodeButton({ node, onSelect }: { node: IRNode; onSelect: (id: string) => void }) {
  return (
    <button type="button" className="tt-node-link" data-node-id={node.id} onClick={() => onSelect(node.id)}>
      {node.title}
    </button>
  );
}

const DIRECTIONS: { id: HighlightDirection; label: string; title: string }[] = [
  { id: 'ancestors', label: 'Needs', title: 'Highlight everything this requires' },
  { id: 'descendants', label: 'Unlocks', title: 'Highlight everything this unlocks' },
  { id: 'both', label: 'Both', title: 'Highlight the whole path through this node' },
];

/**
 * The built-in detail drawer content. Generic for every profile; capability
 * nodes add maturity (current / target), availability, benefit, eurekas,
 * implementations and opaque links resolved by `renderLink`.
 *
 * Headings: the title is `h<headingLevel>` (prop, else `ctx.headingLevel`,
 * else 3) and section titles one level below. The title carries
 * `data-techtree-autofocus` and `tabIndex={-1}`: the view moves focus to it on
 * selection.
 */
export function NodeDetail({ ctx, headingLevel }: { ctx: NodeDetailContext; headingLevel?: HeadingLevel }) {
  const { node, status, statusModel, theme, capability: cap } = ctx;
  const level = headingLevel ?? ctx.headingLevel ?? 3;
  const Title = headingTag(level);
  const sub = level + 1;
  const select = (id: string): void => ctx.select(id);
  const shownStatus =
    status.stored !== null && !statusModel.derivedWhen.includes(status.stored) ? status.stored : status.status;
  const pillColor = statusColor(theme, shownStatus, statusModel);
  const PillIcon = statusIcon(statusIconName(theme, shownStatus, statusModel));
  const KindIcon = KIND_ICONS[node.category ?? ''];
  const target = cap?.target_status;
  const entry = ctx.stateEntry;
  const achieved = new Set(
    entry && typeof entry === 'object' && 'achieved_eurekas' in entry
      ? ((entry as { achieved_eurekas?: string[] }).achieved_eurekas ?? [])
      : [],
  );

  const render = (link: TechTreeLinkRef): ReactNode =>
    ctx.renderLink ? ctx.renderLink(link, { node }) : <DefaultLink link={link} />;
  const renderAll = (links: TechTreeLinkRef[]): { key: string; el: ReactNode }[] =>
    links
      .map((l, i) => ({ key: `${l.type}:${l.ref}:${i}`, el: render(l) }))
      .filter((x) => x.el !== null && x.el !== undefined && x.el !== false);

  const implementations = renderAll((cap?.implementations ?? []).map(parseImplementationRef));
  const linkGroups = CAPABILITY_LINK_RELATIONS.map((rel) => ({
    rel,
    items: renderAll(
      (cap?.links ?? [])
        .filter((l) => l.relation === rel)
        .map((l) => ({ type: l.type, ref: l.ref, relation: l.relation, source: 'link' as const })),
    ),
  })).filter((g) => g.items.length > 0);

  const hasPrereqs = ctx.prerequisites.all.length > 0 || ctx.prerequisites.anyOf.length > 0;
  const availability = !hasPrereqs
    ? null
    : status.prerequisitesMet
      ? `Available — every prerequisite is at least ${(
          statusDef(statusModel, statusModel.satisfying[0] ?? '')?.label ?? 'satisfied'
        ).toLowerCase()}.`
      : `Locked — waiting on ${status.missing.all.length + status.missing.anyOf.length} prerequisite${
          status.missing.all.length + status.missing.anyOf.length === 1 ? '' : 's'
        }.`;

  return (
    <div className="tt-detail" data-node-id={node.id} data-status={status.status}>
      <header className="tt-detail-header">
        <div className="tt-detail-kicker">
          {KindIcon && <KindIcon size={14} aria-hidden />}
          <span data-testid="detail-kind">{KIND_LABELS[node.category ?? ''] ?? node.category ?? 'Node'}</span>
          {ctx.bandTitle && <span data-testid="detail-era"> · {ctx.bandTitle}</span>}
          {ctx.trackTitle && <span data-testid="detail-branch"> · {ctx.trackTitle}</span>}
        </div>
        <Title className="tt-detail-title" tabIndex={-1} data-techtree-autofocus="">
          {node.title}
        </Title>
        <button type="button" className="tt-icon-button" aria-label="Close" onClick={ctx.close}>
          ×
        </button>
      </header>

      <div className="tt-status-row">
        <span
          className="tt-pill"
          data-testid="detail-status"
          data-status={shownStatus}
          style={{ ['--tt-pill-color' as string]: pillColor }}
        >
          {PillIcon && <PillIcon size={12} strokeWidth={2.5} aria-hidden />}
          {statusLabel(shownStatus, statusModel, theme)}
        </span>
        {target && (
          <span className="tt-muted" data-testid="detail-target">
            Target: {statusDef(statusModel, target)?.label ?? target}
          </span>
        )}
      </div>
      {availability && (
        <p className="tt-availability" data-available={status.prerequisitesMet ? 'true' : 'false'}>
          {availability}
        </p>
      )}

      <div className="tt-segmented" role="group" aria-label="Highlight path">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            title={d.title}
            aria-pressed={ctx.highlightDirection === d.id}
            onClick={() => ctx.setHighlightDirection(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {cap?.summary && <p className="tt-summary">{cap.summary}</p>}
      {node.description && <p className="tt-description">{node.description}</p>}
      {cap?.benefit && (
        <Section level={sub} title="Benefit" testId="detail-benefit">
          <p>{cap.benefit}</p>
        </Section>
      )}

      {(ctx.prerequisites.all.length > 0 || ctx.prerequisites.anyOf.length > 0) && (
        <Section level={sub} title="Prerequisites" testId="detail-prerequisites">
          <ul className="tt-list">
            {ctx.prerequisites.all.map((p) => (
              <li key={p.id}>
                <NodeButton node={p} onSelect={select} />
              </li>
            ))}
            {ctx.prerequisites.anyOf.map((group, i) => (
              <li key={`any-${i}`} data-testid="detail-any-of">
                <span className="tt-muted">One of: </span>
                {group.map((p, j) => (
                  <span key={p.id}>
                    {j > 0 && <span className="tt-muted"> or </span>}
                    <NodeButton node={p} onSelect={select} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(ctx.dependents.length > 0 || (cap?.unlocks.length ?? 0) > 0) && (
        <Section level={sub} title="Unlocks" testId="detail-unlocks">
          <ul className="tt-list">
            {ctx.dependents.map((d) => (
              <li key={d.id}>
                <NodeButton node={d} onSelect={select} />
              </li>
            ))}
            {(cap?.unlocks ?? []).map((u, i) => (
              <li key={`u-${i}`} className="tt-unlock-text">
                {u}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {implementations.length > 0 && (
        <Section level={sub} title="Implementations" testId="detail-implementations">
          <ul className="tt-list">
            {implementations.map((x) => (
              <li key={x.key}>{x.el}</li>
            ))}
          </ul>
        </Section>
      )}

      {(cap?.eurekas.length ?? 0) > 0 && (
        <Section level={sub} title="Eureka goals" testId="detail-eurekas">
          <ul className="tt-list tt-eurekas">
            {cap!.eurekas.map((e) => (
              <li key={e.id} data-achieved={achieved.has(e.id) ? 'true' : 'false'}>
                <span aria-hidden>{achieved.has(e.id) ? '✓ ' : '○ '}</span>
                {e.statement}
                {achieved.has(e.id) && <span className="tt-visually-hidden"> (achieved)</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {linkGroups.map((g) => (
        <Section
          key={g.rel}
          level={sub}
          title={`${RELATION_TITLES[g.rel] ?? g.rel} (${g.items.length})`}
          testId={`detail-links-${g.rel}`}
        >
          <ul className="tt-list">
            {g.items.map((x) => (
              <li key={x.key}>{x.el}</li>
            ))}
          </ul>
        </Section>
      ))}

      {cap?.owner && (
        <Section level={sub} title="Owner">
          <p>{cap.owner}</p>
        </Section>
      )}
      <p className="tt-node-id">
        <code>{node.id}</code>
      </p>
    </div>
  );
}
