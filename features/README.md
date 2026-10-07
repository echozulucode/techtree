# Feature specifications

Living documentation for TechTree, written as intent-focused Gherkin. Concrete
values live in `support/` and are read by step definitions at run time. A
coverage manifest (`coverage.yaml`) maps each scenario to its unit + e2e tests
and is gated in CI. See docs/techtree-extraction.md (testing strategy).

First feature files to author: graph_navigation, status_overlay, theming,
state_round_trip.

Tags: `@manual` scenarios are documentation-only. `@unit` scenarios (or whole
features) describe engine behaviour with no browser surface — they are verified
by the unit tests listed for them in `coverage.yaml` and are excluded from the
playwright-bdd run.

Capability profile + embedding: capability_tree, embedding (browser, against the
dev-harness `?embed=engineering-platform` host page), any_of_prerequisites and
capability_validation (`@unit`).
