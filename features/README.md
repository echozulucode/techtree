# Feature specifications

Living documentation for TechTree, written as intent-focused Gherkin. Concrete
values live in `support/` and are read by step definitions at run time. A
coverage manifest (`coverage.yaml`) maps each scenario to its unit + e2e tests
and is gated in CI. See docs/techtree-extraction.md (testing strategy).

First feature files to author: graph_navigation, status_overlay, theming,
state_round_trip.
