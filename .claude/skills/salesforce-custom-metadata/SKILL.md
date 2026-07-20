---
name: salesforce-custom-metadata
description: Conventions for this org's Custom Metadata Types. Use when creating new custom metadata type records.
---

# Custom Metadata

## Custom Metadata Types in use
- `ProjectConfig`

## Design rules for new records
- Record names should describe the configuration they hold, not the type
- Mark records `protected` only when they should not be visible to subscriber orgs
- Prefer Custom Metadata over Custom Settings for new configuration — it's deployable and queryable

See `references/custom-metadata-reference.md` for the full record inventory.
