# @echozedlabs/techtree-viewer

`<TechTreeView>`: the embeddable, accessible tree view for React 18 / 19 hosts (Next.js App Router ready), plus the renderer contract, the React Flow renderer and the standalone viewer shell.

```tsx
'use client';
import '@echozedlabs/techtree-viewer/style.css';
import { TechTreeView } from '@echozedlabs/techtree-viewer';

<TechTreeView ir={ir} state={states} theme="css-variables" colorScheme="system" headingLevel={2} />
```

React and React DOM are peer dependencies (`^18.3.0 || ^19.0.0`).

## Install

```bash
pnpm add @echozedlabs/techtree-viewer @echozedlabs/techtree-ir @echozedlabs/techtree-state
```

All `@echozedlabs/techtree-*` packages are released together with one version
(a fixed group through 0.x): use the same version of each.

Documentation, examples and the changelog live in the repository:
https://github.com/echozulucode/techtree

License: Apache-2.0
