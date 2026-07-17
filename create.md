# Skill: Creating new Salesforce metadata

## When to use this skill
Load this skill when the developer asks Claude to create new Salesforce metadata — Apex classes, triggers, Flows, LWC components, custom objects, permission sets, etc.

## Step-by-step process

### Step 1: Identify the metadata type
From the developer's plain English prompt, determine what they want to build:
- "trigger", "handler", "test class" → Apex (`.claude/skills/salesforce-apex/`)
- "flow", "automation", "record-triggered" → Flows (`.claude/skills/salesforce-flows/`)
- "lwc", "component", "lightning component" → LWC (`.claude/skills/salesforce-lwc/`)
- "object", "custom object", "fields" → Objects (`.claude/skills/salesforce-objects/`)
- "permission set", "permissions", "access" → Perms (`.claude/skills/salesforce-permission-sets/`)
- "custom metadata", "config record" → Custom Metadata (`.claude/skills/salesforce-custom-metadata/`)
- "connected app", "OAuth", "integration" → Connected Apps (`.claude/skills/salesforce-connected-apps/`)
- "prompt template", "Prompt Builder", "Agentforce prompt" → Prompt templates (`.claude/skills/salesforce-prompt-templates/`)
- "flexipage", "Lightning page", "app page", "record page" → FlexiPages (`.claude/skills/salesforce-flexipages/`)
- "approval process" → Approval Processes (`.claude/skills/salesforce-approval-processes/`)

### Step 2: Load the relevant skill
Claude Code auto-loads `SKILL.md` files under `.claude/skills/`, so the relevant skill may already be in context. If more detail is needed than the `SKILL.md` summary provides, read its `references/<type>-reference.md` — it contains this org's actual naming conventions, patterns, and examples extracted from real metadata. If the skill might be stale (org changed since the last forge run), cross-check current state via the MCP tools configured in `.mcp.json` instead of assuming the skill is current.

### Step 3: Generate the metadata
Apply the conventions from the skill file. Mirror:
- **Naming patterns** — prefixes, suffixes, casing
- **Structure** — how existing classes/flows/objects are organized
- **Design decisions** — trigger framework, flow fault handling, LWC patterns

### Step 4: Output ready-to-use files
Produce complete, deployable files. Tell the developer exactly where to place them:
- Apex class → `src/classes/ClassName.cls` + `src/classes/ClassName.cls-meta.xml`
- Apex trigger → `src/triggers/TriggerName.trigger` + `.trigger-meta.xml`
- Flow → `src/flows/FlowName.flow-meta.xml`
- LWC → `src/lwc/componentName/componentName.{js,html,js-meta.xml}`
- Object → `src/objects/ObjectName__c/ObjectName__c.object-meta.xml`

## Example interactions

**Developer:** "Create a trigger on Contact that follows our Apex patterns"
**Claude:** Reads `.claude/skills/salesforce-apex/SKILL.md` (+ `references/apex-reference.md`), identifies the trigger framework used (e.g. ContactTrigger → ContactTriggerHandler), generates both files matching that exact pattern.

**Developer:** "Build a Record-Triggered Flow for Case escalation"
**Claude:** Reads `.claude/skills/salesforce-flows/SKILL.md` (+ `references/flows-reference.md`), mirrors the naming convention and structure of existing flows, generates the complete `.flow-meta.xml`.

**Developer:** "Create a custom object for Supplier Agreements"
**Claude:** Reads `.claude/skills/salesforce-objects/SKILL.md` (+ `references/objects-reference.md`), applies the same namespace prefix, field type choices, and naming conventions found in existing objects.

## Non-negotiable rules
- Always read the relevant skill (and its `references/` file, if needed) before generating any metadata
- Never invent naming conventions — always mirror what exists in the org
- Always generate complete files — no stubs or TODOs
- Always include the `-meta.xml` companion file for every deployable component
