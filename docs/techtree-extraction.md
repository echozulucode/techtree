# TechTree — Extraction Runbook

How to split the generic graph engine out of `skill-tree` into a standalone,
open-source repository, matched to the conventions established by the
`markdown-editor` reference repo.

## Locked decisions

| Decision            | Value                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| GitHub home         | `github.com/echozulucode/techtree` (alongside `markdown-editor`)                                   |
| npm scope           | `@echozedlabs/techtree-*` (prefixed — `@echozedlabs/core` etc. are already taken by markdown-editor) |
| Front-door packages | `@echozedlabs/techtree-viewer` (app devs install this) and `@echozedlabs/techtree-compiler` (the `techtree` CLI) |
| License             | Apache-2.0 (core); commercial edition at the workflow/integration plane (per high-level-plan §9)   |
| Versioning          | **Version-locked `fixed` group through 0.x**, revisit independent versioning at 1.0 (see below)     |
| Git history         | Clean start (fresh initial commit); `git filter-repo` noted as the alternative                      |
| Toolchain           | pnpm `10.34.1`, Node 20+, plain `pnpm -r` (no turbo/nx), ESM-only, `tsc` build (tsup only where CSS ships) |

### Why version-lock through 0.x

The packages have genuinely different cadences (the `server` evolves
independently of `ir`), which normally argues for independent versioning. But
during 0.x the IR contract and package boundaries are still moving, and breaking
changes are cross-cutting — `ir` is the contract everything depends on. A `fixed`
group gives consumers a trivial compatibility rule ("use the same version across
all `@echozedlabs/techtree-*`") at the cost of a few no-op version bumps. Once the
IR stabilizes at 1.0, switch the `fixed` group to independent + `linked` only
where coupling is real. This is also exactly what markdown-editor does, so the two
repos stay mentally identical.

## Package mapping

| skill-tree                | techtree                                  | Notes                                       |
| ------------------------- | ----------------------------------------- | ------------------------------------------- |
| `@echozedlabs/techtree-ir`          | `@echozedlabs/techtree-ir`                | Pure IR types. The contract.                |
| `@echozedlabs/techtree-schema`      | `@echozedlabs/techtree-schema`            | Core node + theme Zod schemas; profile schemas layer on top. |
| `@echozedlabs/techtree-compiler`    | `@echozedlabs/techtree-compiler`          | Pipeline + `techtree` CLI bin.              |
| `@echozedlabs/techtree-state`       | `@echozedlabs/techtree-state`             | Status overlay + adapters (file/local/API). |
| `@echozedlabs/techtree-themes`      | `@echozedlabs/techtree-themes`            | Built-in themes.                            |
| `@echozedlabs/techtree-viewer`      | `@echozedlabs/techtree-viewer`            | Shell + renderer contract + RF renderer. Ships CSS → build with tsup. |
| `@echozedlabs/techtree-server`      | `@echozedlabs/techtree-server`            | Optional governance server.                 |
| (the skill app itself)    | stays in `skill-tree`, becomes a profile  | Depends on `@echozedlabs/techtree-*`.       |

## Sequencing (do not reorder)

### Stage 1 — Generalize in place (in `skill-tree`, before any split)

Splitting a half-generalized codebase means refactoring across two repos at once.
Do the generalization first, keep all 38 tests green, then extract clean packages.

1. Add an open `data` bag to `IRNode`; move `difficulty`/`estimated_hours`/`learning_resources`/`workflow` out of the core type into the skill profile's `data`.
2. Introduce the `Profile` interface (node schema + edge kinds + status model + presentation field-descriptors + lint rules + theme slots).
3. Refactor the skill app to consume itself **through** the profile.
4. Rename engine-level identifiers: `era→band`, `path→track`, `skill_count→node_count`, `SkillNode→GraphNode` (reads field descriptors).
5. Prove it with a second profile (delivery-narrative: events/experiments/milestones) so the boundary is validated by a non-skill consumer *before* extraction.

**Exit criteria:** core packages contain no `skill`/`era` identifiers; both the skill profile and the delivery profile build and render; `pnpm test` green.

### Stage 2 — Create the repo (clean start)

```bash
# scratch dir
mkdir techtree && cd techtree
git init -b main
# copy the generalized packages/ir, schema, compiler, state, themes, viewer, server
# (rename @echozedlabs/techtree-* -> @echozedlabs/techtree-* in every package.json + import)
git add -A
git commit -m "chore: initial extraction of techtree engine from skill-tree"
git remote add origin https://github.com/echozulucode/techtree.git
```

> **Alternative (history-preserving):** `git filter-repo --path packages/ir --path packages/compiler …`
> from a clone of skill-tree, then graft. Only worth it after Stage 1, and only if
> you value line-level blame over a clean public history.

### Stage 3 — Scaffold the repo surface

Add the config files below, then `examples/dev-harness` (Vite app loading a sample
IR), `features/` (Gherkin + `coverage.yaml`), `scripts/` (copy
`check-feature-coverage.mjs` + `lint-feature-intent.mjs` from markdown-editor),
`docs/` (project-docs flow), and `PUBLISHING.md`/`CONTRIBUTING.md`/`README.md`.

### Stage 4 — Point `skill-tree` back at it

Replace `@echozedlabs/techtree-{ir,compiler,…}` deps with `@echozedlabs/techtree-*`. During
active development use a pnpm workspace link or `file:` ranges; switch to published
versions once techtree stabilizes. The skill app becomes the first real consumer —
proof the boundary held.

---

## Ready-to-paste config

### `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "examples/*"
```

### `tsconfig.base.json` (verbatim from markdown-editor)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### root `package.json`

```json
{
  "name": "techtree",
  "version": "0.0.0",
  "private": true,
  "description": "TechTree — compile, render, and govern typed dependency graphs that change state over time.",
  "license": "Apache-2.0",
  "author": "Eric Zimmerman (https://echozed.com)",
  "homepage": "https://echozed.com",
  "repository": { "type": "git", "url": "git+https://github.com/echozulucode/techtree.git" },
  "bugs": { "url": "https://github.com/echozulucode/techtree/issues" },
  "type": "module",
  "packageManager": "pnpm@10.34.1",
  "engines": { "node": ">=20.0.0", "pnpm": ">=10.0.0" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter @echozedlabs/dev-harness test:e2e",
    "test:bdd": "pnpm --filter @echozedlabs/dev-harness test:bdd",
    "typecheck": "pnpm -r typecheck",
    "check:coverage": "node scripts/check-feature-coverage.mjs",
    "lint:features": "node scripts/lint-feature-intent.mjs",
    "verify:features": "pnpm check:coverage && pnpm lint:features",
    "dev:harness": "pnpm --filter @echozedlabs/dev-harness dev",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm -r build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.10",
    "@types/node": "^22.7.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  },
  "pnpm": { "onlyBuiltDependencies": ["esbuild"] }
}
```

### `.changeset/config.json` (version-locked group)

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [
    [
      "@echozedlabs/techtree-ir",
      "@echozedlabs/techtree-schema",
      "@echozedlabs/techtree-compiler",
      "@echozedlabs/techtree-state",
      "@echozedlabs/techtree-themes",
      "@echozedlabs/techtree-viewer",
      "@echozedlabs/techtree-server"
    ]
  ],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Per-package `package.json` template (e.g. `packages/ir`)

```json
{
  "name": "@echozedlabs/techtree-ir",
  "version": "0.1.0",
  "description": "TechTree IR types — the contract consumed by every downstream tool.",
  "type": "module",
  "license": "Apache-2.0",
  "author": "Eric Zimmerman (https://echozed.com)",
  "homepage": "https://echozed.com",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/echozulucode/techtree.git",
    "directory": "packages/ir"
  },
  "bugs": { "url": "https://github.com/echozulucode/techtree/issues" },
  "keywords": ["graph", "dag", "dependency", "tech-tree", "visualization"],
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prepublishOnly": "pnpm build"
  }
}
```

> `techtree-viewer` ships React + CSS — build it with **tsup** instead of plain
> `tsc` (`"build": "tsup src/index.ts --format esm --dts"` + a CSS entry), keeping
> the same `exports`/`files`/`publishConfig` shape.

### `examples/dev-harness/package.json`

```json
{
  "name": "@echozedlabs/dev-harness",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "echo \"Run pnpm --filter @echozedlabs/dev-harness test:e2e for browser coverage.\"",
    "test:e2e": "playwright test",
    "test:bdd": "bddgen --config playwright.bdd.config.ts && playwright test --config playwright.bdd.config.ts",
    "typecheck": "tsc -b --pretty false"
  },
  "dependencies": {
    "@echozedlabs/techtree-viewer": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.54.0",
    "@types/react": "^18.3.28",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^4.2.1",
    "playwright-bdd": "^9.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

### `examples/dev-harness/playwright.config.ts` (hand-written e2e)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev -- --host 127.0.0.1 --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

### `examples/dev-harness/playwright.bdd.config.ts` (executable Gherkin)

```ts
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  featuresRoot: '../../features',
  features: ['../../features/**/*.feature'],
  steps: ['bdd-steps/**/*.ts'],
  tags: 'not @performance',
});

const externalServer = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
  ],
  webServer: externalServer
    ? undefined
    : {
        command: 'pnpm dev -- --host 127.0.0.1 --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
```

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10.34.1 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm -r build
      - name: Typecheck
        run: pnpm -r typecheck
      - name: Test
        run: pnpm -r test
      - name: Verify feature coverage and intent
        run: pnpm verify:features
  bdd:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10.34.1 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Build packages
        run: pnpm -r build
      - name: Install Playwright browser
        run: pnpm --filter @echozedlabs/dev-harness exec playwright install --with-deps chromium
      - name: Run executable BDD feature tests
        run: pnpm test:bdd
```

### `.github/workflows/release.yml` (Changesets + OIDC trusted publishing)

```yaml
name: Release
on:
  push: { branches: [main] }
concurrency: ${{ github.workflow }}-${{ github.ref }}
permissions:
  contents: write
  pull-requests: write
  id-token: write # npm provenance + OIDC trusted publishing (tokenless)
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10.34.1 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Create Release PR or publish
        uses: changesets/action@v1
        with:
          version: pnpm version-packages
          publish: pnpm release
          commit: "chore: version packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_PROVENANCE: "true"
```

> First publish must be manual (`npm login` + `pnpm release`) so the package names
> exist on npm; then configure a **trusted publisher per package** (org
> `echozulucode`, repo `techtree`, workflow `release.yml`) and OIDC takes over.
> The markdown-editor `PUBLISHING.md` is a complete runbook for this — copy it and
> swap the repo/package names.

## Testing strategy (three layers + a gate)

1. **Unit** — `vitest run` per package (the compiler/IR/state logic moves over with its existing tests).
2. **E2E** — Playwright specs in `examples/dev-harness/e2e/` driving the real viewer.
3. **Executable BDD** — `features/*.feature` (intent-only Gherkin; concrete values in `features/support/contract.yaml`) run via `playwright-bdd`.
4. **Coverage gate** — `features/coverage.yaml` maps every scenario → its unit + e2e tests; `pnpm verify:features` fails CI on any `none` scenario or dangling test id. Copy both `scripts/*.mjs` from markdown-editor unchanged.

Good first feature files for the viewer: `graph_navigation.feature` (pan/zoom/fit,
select, ancestor/descendant highlight), `status_overlay.feature` (locked/available
derivation, mark progress), `theming.feature`, `state_round_trip.feature`.

## Definition of done

- `pnpm install && pnpm build && pnpm typecheck && pnpm test && pnpm verify:features` green in the new repo.
- `pnpm test:bdd` green against the dev-harness.
- Both a skill profile and the delivery-narrative profile render in the dev-harness with **zero** core-package edits.
- `skill-tree` consumes `@echozedlabs/techtree-*` and still passes its suite.
- First `0.1.0` published; trusted publishers configured; CI + Release workflows green on `main`.
