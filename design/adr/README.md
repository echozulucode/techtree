# Architecture Decision Records

Each ADR captures one decision, its context, and its consequences. Decisions
inherited from the project TechTree was extracted from (skill-tree) are recorded
here so this repo is self-documenting for new contributors.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-react-flow-renderer.md) | React Flow as the canvas renderer | Accepted |
| [0002](0002-profile-corenode-seam.md) | Profile / CoreNode seam for a domain-agnostic engine | Accepted |
| [0003](0003-node-sqlite-server-store.md) | `node:sqlite` for the server state store | Accepted |
| [0004](0004-apache-2-oss-core.md) | Apache-2.0 OSS core; commercial boundary at the workflow plane | Accepted |
| [0005](0005-version-locked-packages.md) | Version-lock packages as one group through 0.x | Accepted |

New ADRs: copy an existing one, number it `NNNN-short-title.md`, add a row above.
See `docs/overview.md` for the architecture these decisions shape.
