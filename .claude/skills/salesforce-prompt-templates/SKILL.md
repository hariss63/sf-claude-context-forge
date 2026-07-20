---
name: salesforce-prompt-templates
description: Conventions for this org's Prompt Builder / GenAI prompt templates. Use when creating a new Agentforce or Prompt Builder template.
---

# Prompt templates (Prompt Builder / Agentforce)

## Template types in use
- einstein_gpt__caseReply
- einstein_gpt__salesEmail

## Design rules for new prompt templates
- Keep grounding/merge-field references explicit and scoped to the fields actually needed
- Give every template a description explaining its business purpose
- Test each template version before activating it

See `references/prompt-templates-reference.md` for the full inventory.
