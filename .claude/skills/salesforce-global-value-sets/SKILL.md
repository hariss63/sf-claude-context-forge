---
name: salesforce-global-value-sets
description: This org's shared picklist value sets. Use when creating picklist fields that reference a global value set.
---

# Global Value Sets

## Value sets in this org
- `Account_Industry` — 5 value(s) (sorted)
- `Project_Status` — 5 value(s)

## Design rules for new picklist fields
- Prefer referencing an existing global value set over defining inline values
- Add new values to the global set so all fields sharing it stay consistent

See `references/global-value-sets-reference.md` for the full value inventory.
