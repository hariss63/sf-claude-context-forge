# Skill: Creating new Salesforce metadata

## When to use this skill
Load this skill when the developer asks Claude to create new Salesforce metadata — Apex classes, triggers, Flows, LWC components, custom objects, permission sets, etc.

## Step-by-step process

### Step 1: Identify the metadata type
From the developer's plain English prompt, determine what they want to build:
- "trigger", "handler", "test class" → Apex (`generated/apex/classes.md`)
- "flow", "automation", "record-triggered" → Flows (`generated/flows/flows.md`)
- "lwc", "component", "lightning component" → LWC (`generated/lwc/lwc.md`)
- "object", "custom object", "fields" → Objects (`generated/objects/objects.md`)
- "permission set", "permissions", "access" → Perms (`generated/perms/permissionsets.md`)

### Step 2: Load the relevant generated skill
Read the corresponding file from `generated/`. It contains this org's actual naming conventions, patterns, and examples extracted from real metadata.

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
**Claude:** Reads `generated/apex/classes.md`, identifies the trigger framework used (e.g. ContactTrigger → ContactTriggerHandler), generates both files matching that exact pattern.

**Developer:** "Build a Record-Triggered Flow for Case escalation"
**Claude:** Reads `generated/flows/flows.md`, mirrors the naming convention and structure of existing flows, generates the complete `.flow-meta.xml`.

**Developer:** "Create a custom object for Supplier Agreements"
**Claude:** Reads `generated/objects/objects.md`, applies the same namespace prefix, field type choices, and naming conventions found in existing objects.

## Non-negotiable rules
- Always read the generated skill before generating any metadata
- Never invent naming conventions — always mirror what exists in the org
- Always generate complete files — no stubs or TODOs
- Always include the `-meta.xml` companion file for every deployable component
