# TechTree

Compile, render, and govern **typed dependency graphs that change state over time**.
Skills, project milestones, experiments, roadmaps — each is a *profile* over one
engine. Extracted from the skill-tree project; see `docs/` for the overview and
the original architecture plans.

```bash
pnpm install
pnpm build
pnpm --filter @echozedlabs/techtree-compiler cli build examples/ai-delivery --profile delivery
pnpm dev:harness   # the viewer + Playwright target
```

Packages: `@echozedlabs/techtree-ir`, `@echozedlabs/techtree-schema`, `@echozedlabs/techtree-compiler`, `@echozedlabs/techtree-state`, `@echozedlabs/techtree-themes`, `@echozedlabs/techtree-viewer`, `@echozedlabs/techtree-server`.

License: Apache-2.0.
