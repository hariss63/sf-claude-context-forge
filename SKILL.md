# sf-claude-context-forge — master skill

## What this repo does
This repository converts Salesforce SFDX metadata into Claude-ready skill files, and uses those skills to generate new Salesforce metadata that matches an org's exact conventions.

## Two workflows

### Workflow 1: Forge skills from existing metadata
Triggered when the developer wants Claude to learn the org's patterns.

**Steps:**
1. Developer places SFDX metadata in `src/` (or uses `demo-metadata/` to try it out)
2. Runs `./forge.sh` (or `npm run forge` or `python forge.py`)
3. Forge parses all metadata types and writes skill files to `generated/`
4. Developer reviews `generated/` and optionally pushes to Claude Code skills folder

**Output structure:**
```
generated/
  objects/objects.md      ← custom object & field conventions
  flows/flows.md          ← flow types, naming, patterns
  apex/classes.md         ← Apex class patterns and trigger conventions
  lwc/lwc.md              ← LWC component patterns
  perms/permissionsets.md ← permission set access model
  profiles/profiles.md    ← profile inventory
  layouts/layouts.md      ← page layout conventions
  templates/templates.md  ← email template patterns
```

### Workflow 2: Generate new metadata from a plain English prompt
Triggered when the developer asks Claude to build something new.

**How Claude should respond:**
1. Read the relevant skill file(s) from `generated/` for the metadata type being created
2. Use the naming conventions, patterns, and examples from those skills
3. Generate metadata that mirrors the org's existing structure exactly
4. Output the complete file(s) ready to drop into `src/`

**Example prompts and which skills to load:**
- "Create a trigger on Contact" → load `generated/apex/classes.md`
- "Build a Flow for Case escalation" → load `generated/flows/flows.md`
- "Create a custom object for Supplier Agreements" → load `generated/objects/objects.md`
- "Build an LWC component for account summary" → load `generated/lwc/lwc.md`
- "Create a permission set for read-only access" → load `generated/perms/permissionsets.md`

## Key conventions Claude must follow
- Always mirror the naming patterns found in the generated skill for the target metadata type
- For Apex: one trigger per object, all logic in a handler class, always `with sharing`
- For Flows: always add a description, handle fault paths
- For LWC: .js + .html + .js-meta.xml always together, @wire for reads, imperative for writes
- For objects: mirror existing prefix patterns, always add a description

## File locations
- `org-config.json` — org settings, source and output paths
- `src/` — developer's SFDX metadata (input)
- `demo-metadata/` — sample metadata for first-time use
- `generated/` — Claude skill files (output of forge)
- `skills/` — static skills always loaded (this file + forge.md + create.md)
- `scripts/node/` — Node.js parsers and generator
- `scripts/python/` — Python parsers and generator
