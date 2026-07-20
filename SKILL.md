# sf-claude-context-forge — master skill

## What this repo does
This repository converts Salesforce SFDX metadata into Claude-ready skill files, and uses those skills to generate new Salesforce metadata that matches an org's exact conventions.

## Two workflows

### Workflow 1: Forge skills from existing metadata
Triggered when the developer wants Claude to learn the org's patterns.

**Steps:**
1. Developer places SFDX metadata in `src/` (or uses `demo-metadata/` to try it out)
2. Runs `./forge.sh` (or `npm run forge` or `python forge.py`)
3. Forge parses all metadata types and writes skill files to `.claude/skills/`
4. Claude Code auto-loads all `.claude/skills/*/SKILL.md` files — no manual push step needed

**Output structure:**
```
.claude/skills/
  salesforce-objects/SKILL.md + references/objects-reference.md
  salesforce-apex/SKILL.md + references/apex-reference.md
  salesforce-flows/SKILL.md + references/flows-reference.md
  salesforce-lwc/SKILL.md + references/lwc-reference.md
  salesforce-permission-sets/SKILL.md + references/
  salesforce-profiles/SKILL.md + references/
  salesforce-layouts/SKILL.md + references/
  salesforce-email-templates/SKILL.md + references/
  salesforce-custom-metadata/SKILL.md + references/
  salesforce-connected-apps/SKILL.md + references/
  salesforce-prompt-templates/SKILL.md + references/
  salesforce-flexipages/SKILL.md + references/
  salesforce-approval-processes/SKILL.md + references/
  salesforce-global-value-sets/SKILL.md + references/
  salesforce-custom-permissions/SKILL.md + references/
  salesforce-assignment-rules/SKILL.md + references/
  salesforce-applications/SKILL.md + references/
  salesforce-reports/SKILL.md + references/
  salesforce-dashboards/SKILL.md + references/
  salesforce-static-resources/SKILL.md + references/
  salesforce-named-credentials/SKILL.md + references/
  salesforce-external-credentials/SKILL.md + references/
generated/reference/
  <type>.md   ← plain reference docs for non-creatable types (generic fallback)
```

### Workflow 2: Generate new metadata from a plain English prompt
Triggered when the developer asks Claude to build something new.

**How Claude should respond:**
1. Read the relevant skill file(s) from `.claude/skills/` for the metadata type being created
2. Use the naming conventions, patterns, and examples from those skills
3. Generate metadata that mirrors the org's existing structure exactly
4. Output the complete file(s) ready to drop into `src/`

**Example prompts and which skills to load:**
- "Create a trigger on Contact" → load `.claude/skills/salesforce-apex/SKILL.md`
- "Build a Flow for Case escalation" → load `.claude/skills/salesforce-flows/SKILL.md`
- "Create a custom object for Supplier Agreements" → load `.claude/skills/salesforce-objects/SKILL.md`
- "Build an LWC component for account summary" → load `.claude/skills/salesforce-lwc/SKILL.md`
- "Create a permission set for read-only access" → load `.claude/skills/salesforce-permission-sets/SKILL.md`
- "Add a Global Value Set for Status" → load `.claude/skills/salesforce-global-value-sets/SKILL.md`
- "Create a Named Credential for an external API" → load `.claude/skills/salesforce-named-credentials/SKILL.md`

## Key conventions Claude must follow
- Always mirror the naming patterns found in the generated skill for the target metadata type
- For Apex: one trigger per object, all logic in a handler class, always `with sharing`
- For Flows: always add a description, handle fault paths
- For LWC: .js + .html + .js-meta.xml always together, @wire for reads, imperative for writes
- For objects: mirror existing prefix patterns, always add a description

## File locations
- `org-config.json` — org settings, source and output paths
- `src/` — developer's SFDX metadata (input)
- `demo-metadata/` — sample metadata for first-time use (all 23 supported types)
- `.claude/skills/` — generated Claude Agent Skills (output of forge, auto-loaded by Claude Code)
- `generated/reference/` — plain reference docs for non-creatable metadata types
- `retrieve.sh` — login + retrieve metadata + forge in one command
- `scripts/node/` — Node.js parsers and generator
- `scripts/python/` — Python parsers and generator
