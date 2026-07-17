---
name: salesforce-flows
description: Conventions for building Flows in this org. Use when creating new Flows, Screen Flows, or Record-Triggered Flows.
---

# Flows & automations

## Flow types in use
- Flow
- AutoLaunchedFlow

## Naming patterns
Examples from this org: `Case_Escalation`, `Project_Status_Notification`

## Design rules for new flows
- Match the naming conventions shown above
- Record-triggered flows should specify trigger type (Before Save / After Save)
- Always add a description explaining the flow's business purpose
- Fault paths should be handled for all DML operations

See `references/flows-reference.md` for the full flow inventory.
