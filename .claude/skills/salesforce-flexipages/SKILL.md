---
name: salesforce-flexipages
description: Conventions for this org's Lightning pages (FlexiPages). Use when creating a new App Page, Record Page, or Home Page.
---

# FlexiPages (Lightning App Builder)

## Page types in use
- AppPage
- RecordPage

## Design rules for new pages
- Name pages by their purpose and object, e.g. `{Object}_Record_Page`
- Record pages should declare the `sobjectType` they target
- Reuse existing components before building new custom ones

See `references/flexipages-reference.md` for the full inventory.
