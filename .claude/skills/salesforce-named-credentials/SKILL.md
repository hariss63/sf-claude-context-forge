---
name: salesforce-named-credentials
description: This org's Named Credentials. Use when making authenticated callouts to external services.
---

# Named Credentials

## Auth protocols in use
- OAuth

## Design rules for new named credentials
- Always use a named credential instead of hardcoding endpoints or secrets in Apex
- Match the principalType and protocol patterns already used in this org

See `references/named-credentials-reference.md` for the full inventory.
