# Post-Migration Cleanup Plan

Files and directories to remove from `attest-framework/attest` after the documentation site migration is verified and all links are updated.

## Files to Remove

| Path | Type | Reason |
|------|------|--------|
| `docs/` | Directory (entire tree) | Content migrated to `attest-website` |
| `mkdocs.yml` | File | MkDocs config replaced by Starlight/Astro |
| `.github/workflows/docs.yml` | File | Deploy workflow replaced by `attest-website` GitHub Pages workflow |

## Current `docs/` Contents

- `docs/index.md`
- `docs/overview.md`
- `docs/getting-started.md`
- `docs/changelog.md`
- `docs/guides/multi-agent.md`
- `docs/guides/simulation.md`
- `docs/guides/framework-adapters.md`
- `docs/reference/python/index.md`
- `docs/reference/python/expect.md`
- `docs/reference/python/adapters.md`
- `docs/migration/from-deepeval.md`
- `docs/migration/from-manual-testing.md`
- `docs/migration/from-promptfoo.md`
- `docs/tutorials/writing-a-framework-adapter.md`
- `docs/blog/v040-launch.md`
- `docs/assets/diagrams/.gitkeep`

## Prerequisites Before Deletion

1. Verify all content is migrated and accessible on `attest-framework.github.io/attest-website/`
2. Verify `docs/redirect-index.html` is deployed or DNS redirect is in place
3. Update any external links pointing to old docs URL
4. Confirm GitHub Pages source for `attest` repo is no longer needed (or reconfigured)

## Execution

Submit as a single PR: `chore(docs): remove migrated mkdocs content`

Requires explicit user approval.
