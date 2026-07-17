---
name: salesforce-apex
description: Conventions for writing Apex classes and triggers in this org. Use when writing new Apex classes, trigger handlers, or test classes.
---

# Apex classes & triggers

## Class naming conventions
Examples: `ProjectService`, `ProjectTriggerHandler`, `ProjectTriggerHandler_Test`

- Trigger handlers named: `{Object}TriggerHandler`
- Service classes named: `{Domain}Service`
- Test classes named: `{ClassName}Test`

## Trigger conventions
- `ProjectTrigger` → object: Project__c, events: before insert, before update, after update

## Design rules for new Apex
- One trigger per object — all logic in a handler class
- Bulkify all trigger logic (never query or DML inside loops)
- Test classes must have @isTest annotation and achieve 90%+ coverage
- Use `with sharing` on all new classes unless explicitly required otherwise
- Constants go in a dedicated `Constants` or `{Domain}Constants` class

See `references/apex-reference.md` for the full class/trigger inventory.
