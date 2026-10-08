import { useEffect, useState } from 'react';
import type { IR } from '@echozedlabs/techtree-ir';
import type { TreeState } from '@echozedlabs/techtree-state';
import {
  TechTreeView,
  type ColorScheme,
  type TechTreeInitialFocus,
  type TechTreeLinkRef,
} from '@echozedlabs/techtree-viewer';

// A stand-in for a host application (e.g. the Engineering Example Library):
// it loads the compiled IR + its own stored states, and resolves the opaque
// links itself — including withholding items the reader may not see.
// Everything here is demo data.

/** Items this fictional host treats as drafts: never shown, never counted. */
const DRAFTS = new Set(['example:can-decoder-from-dbc']);

function renderLink(link: TechTreeLinkRef) {
  const key = `${link.type}:${link.ref}`;
  if (DRAFTS.has(key)) return null;
  if (link.type === 'example') {
    return (
      <a href={`#/examples/${link.ref}`} data-testid="host-link" data-ref={key}>
        {link.ref.replace(/-/g, ' ')}
      </a>
    );
  }
  if (link.type === 'technology' || link.type === 'feature') {
    return (
      <a href={`#/search?${link.type}=${link.ref}`} data-testid="host-link" data-ref={key}>
        {link.ref.replace(/-/g, ' ')}
      </a>
    );
  }
  return (
    <span data-testid="host-link" data-ref={key}>
      {link.type}: {link.ref}
    </span>
  );
}

export interface EmbedDemoProps {
  name: string;
  colorScheme: ColorScheme;
  /** `?focus=frontier|<node id>` → initialFocus. */
  initialFocus?: TechTreeInitialFocus;
  /** `?zoom=<number>` → initialZoom. */
  initialZoom?: number;
}

export function EmbedDemo({ name, colorScheme, initialFocus, initialZoom }: EmbedDemoProps) {
  const [ir, setIr] = useState<IR | null>(null);
  const [state, setState] = useState<TreeState | null>(null);
  useEffect(() => {
    void Promise.all([
      fetch(`/ir/${name}.ir.json`).then((r) => r.json() as Promise<IR>),
      fetch(`/ir/${name}.state.json`)
        .then((r) => (r.ok ? (r.json() as Promise<TreeState>) : null))
        .catch(() => null),
    ]).then(([i, s]) => {
      setIr(i);
      setState(s);
    });
  }, [name]);

  return (
    // Page structure like a real host: a header, <main> with the page's h1, and
    // the view's headings continuing at h2 (headingLevel).
    <div
      className={colorScheme === 'system' ? undefined : colorScheme}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        background: colorScheme === 'dark' ? '#10131a' : '#ffffff',
        color: colorScheme === 'dark' ? '#e8e6df' : '#1f2430',
      }}
    >
      <header style={{ padding: '8px 14px', borderBottom: '1px solid #8a8f9c' }}>
        <strong>Host app</strong> · embedded TechTreeView · demo data
      </header>
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 16, margin: '6px 14px' }}>{ir?.tree.title ?? name}</h1>
        <div style={{ flex: 1, minHeight: 0 }}>
          {ir && (
            <TechTreeView
              ir={ir}
              state={state?.skills ?? null}
              theme="css-variables"
              colorScheme={colorScheme}
              headingLevel={2}
              renderLink={renderLink}
              {...(initialFocus ? { initialFocus } : {})}
              {...(initialZoom !== undefined ? { initialZoom } : {})}
            />
          )}
        </div>
      </main>
    </div>
  );
}
