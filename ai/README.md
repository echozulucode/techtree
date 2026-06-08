# AI working area (LOW authority)

Scratch space for AI-generated documentation. **Nothing here is authoritative**
until a human reviews it and promotes it into `docs/` or `design/`.

| Folder | Purpose |
| --- | --- |
| `drafts/` | AI-generated docs awaiting review. Name as `YYYY-MM-DD-topic.md`. |

**Flow:** draft in `ai/drafts/` → review → promote validated content into `docs/`
(procedures) or `design/` (decisions/components), updating `doc-map.yaml` → move
the superseded draft to `docs/archive/`.

Related folders live under `docs/` (not `ai/`): research outputs go in
`docs/research/`, and superseded material is archived in `docs/archive/`. Project
decisions become ADRs under `design/adr/`.
