import { useEffect, useState } from 'react';
import type { IR } from '@echozedlabs/techtree-ir';
import type { TreeState } from '@echozedlabs/techtree-state';
import { TechTreeView, type ColorScheme, type TechTreeLinkRef } from '@echozedlabs/techtree-viewer';

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

export function EmbedDemo({ name, colorScheme }: { name: string; colorScheme: ColorScheme }) {
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '8px 14px', borderBottom: '1px solid #ccc' }}>
        <strong>Host app</strong> · embedded TechTreeView · demo data
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        {ir && (
          <TechTreeView
            ir={ir}
            state={state?.skills ?? null}
            theme="css-variables"
            colorScheme={colorScheme}
            renderLink={renderLink}
          />
        )}
      </div>
    </div>
  );
}
