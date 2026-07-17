---
name: salesforce-objects
description: Conventions for creating custom objects and fields in this org. Use when creating or modifying Salesforce custom objects, custom fields, or object metadata.
---

# Custom objects & fields

## Naming conventions
- **Namespace/prefix patterns found:** Account, Project
- Custom objects end with `__c`
- Custom fields end with `__c`

## Design rules for new objects
- Mirror the naming prefix patterns listed above
- Always include a Description on new objects
- Required fields should be clearly marked
- Lookup fields should follow the pattern: `RelatedObject__c`

See `references/objects-reference.md` for the full inventory of objects and fields in this org.
