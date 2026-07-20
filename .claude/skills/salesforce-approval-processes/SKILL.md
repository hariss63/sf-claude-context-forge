---
name: salesforce-approval-processes
description: Conventions for this org's Approval Processes. Use when creating a new approval process.
---

# Approval Processes

## Objects with approval processes
- Project__c

## Design rules for new approval processes
- Give every process a description explaining when it triggers and why
- Define an explicit rejection/recall path, not just the approval path
- Keep entry criteria narrow enough to avoid unintended submissions

See `references/approval-processes-reference.md` for the full inventory.
