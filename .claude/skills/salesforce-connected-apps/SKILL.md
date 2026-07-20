---
name: salesforce-connected-apps
description: Conventions for this org's Connected Apps. Use when creating a new Connected App for an integration.
---

# Connected Apps

## OAuth scopes commonly used in this org
- Api
- RefreshToken
- MobileSmartStore
- OpenID

## Design rules for new connected apps
- Request the minimum OAuth scopes needed for the integration
- Always set a contact email for ownership traceability
- Prefer named credentials / external client apps over storing secrets in Apex

See `references/connected-apps-reference.md` for the full inventory.
