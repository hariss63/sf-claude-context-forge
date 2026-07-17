---
name: salesforce-lwc
description: Conventions for building Lightning Web Components in this org. Use when creating new LWC components.
---

# LWC components

## Component naming conventions
- camelCase for component folder and files
- Examples from this org: `projectSummary`

## Design rules for new LWC
- Every component needs: .js, .html, .js-meta.xml
- Use @wire for read operations, imperative Apex for write operations
- Fire events upward, properties downward
- CSS scoped to component — no global styles

See `references/lwc-reference.md` for the full component inventory.
