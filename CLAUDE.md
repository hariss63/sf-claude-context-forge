# sf-claude-context-forge

## What this project does

sf-claude-context-forge is a code-generation scaffold for Salesforce developers working with Claude Code. It operates in three phases:

1. **Forge phase** — reads real Salesforce SFDX metadata from `src/` (or `demo-metadata/`), parses it, and generates native Claude Agent Skills into `.claude/skills/`. 23 metadata types (objects, flows, classes, triggers, lwc, permissionsets, profiles, layouts, emailTemplates, customMetadata, connectedApps, genAiPromptTemplates, flexipages, approvalProcesses, globalValueSets, customPermissions, assignmentRules, applications, reports, dashboards, staticresources, namedCredentials, externalCredentials) get a dedicated `SKILL.md` + `references/<type>-reference.md`. Any other metadata type found in `src/` falls back to a generic parser and is written as a plain reference doc under `generated/reference/` instead of a full skill. These skills teach Claude the org's actual naming conventions, object model, Apex patterns, Flow structures, and component architecture.

2. **Create phase** — once Claude Code has auto-loaded the skills under `.claude/skills/`, you ask it to create new Salesforce metadata (objects, fields, Apex classes, Flows, LWC components, Custom Metadata records, Connected Apps, Prompt Builder templates, Global Value Sets, Named Credentials, and more) and it follows the org's real patterns automatically instead of generating generic boilerplate.

3. **Live query phase** — `.mcp.json` wires up the official Salesforce DX MCP Server (`@salesforce/mcp`), so Claude can also query the live org (describe objects, run SOQL) alongside reading the forged skills.

The bridge between phases 1 and 2 is `.claude/skills/`. The forge step writes it; Claude Code auto-loads it — no manual push step.

---

## Workflows

### Workflow 1: Forge — src/ → .claude/skills/

```
./forge.sh
# or
npm run forge
# or
python forge.py
```

This reads metadata from `src/` (your SFDX project source) and writes Agent Skills into `.claude/skills/` (dedicated types) plus reference docs into `generated/reference/` (everything else, auto-detected).

To run against the bundled demo metadata:
```
./forge.sh --demo
# or
npm run forge:demo
# or
python forge.py --demo
```

To preview without writing files:
```
./forge.sh --dry-run
npm run forge:dry
python forge.py --dry-run
```

### Workflow 2: Create — prompt → new SF metadata

After forging, skills under `.claude/skills/` are auto-loaded by Claude Code — no manual step needed:
1. Ask Claude to generate new metadata: "Create a custom object called Vendor__c with fields for Rating and ContractValue"
2. Claude reads the relevant skill (e.g. `.claude/skills/salesforce-objects/SKILL.md` + its `references/` file) and uses the org's conventions to produce correct, consistent SFDX source-format XML and Apex

### Workflow 3: Live org queries via MCP

`.mcp.json` configures the official Salesforce DX MCP Server (`@salesforce/mcp`), pointed at the org alias in `orgAlias`/`--orgs`. Use it when Claude needs to check current live org state (e.g. "does this field already exist?") rather than relying solely on the last `src/` retrieve.

---

## Directory structure

```
sf-claude-context-forge/
├── CLAUDE.md                    ← this file
├── forge.js                     ← Node.js entry point
├── forge.py                     ← Python entry point
├── forge.sh                     ← Shell entry point (wraps Node or Python)
├── retrieve.sh                  ← Login + retrieve metadata + forge in one command
├── org-config.json              ← Org name and preferences
├── .mcp.json                    ← Live org access via @salesforce/mcp
├── package.json                 ← npm scripts
├── requirements.txt             ← Python deps (stdlib only)
│
├── src/                         ← Your SFDX metadata goes here (gitkeep placeholder)
│   └── .gitkeep
│
├── .claude/
│   └── skills/                  ← Output: native Claude Agent Skills (auto-loaded)
│       ├── salesforce-objects/SKILL.md + references/
│       ├── salesforce-apex/SKILL.md + references/       (classes + triggers)
│       ├── salesforce-flows/SKILL.md + references/
│       ├── salesforce-lwc/SKILL.md + references/
│       ├── salesforce-permission-sets/SKILL.md + references/
│       ├── salesforce-profiles/SKILL.md + references/
│       ├── salesforce-layouts/SKILL.md + references/
│       ├── salesforce-email-templates/SKILL.md + references/
│       ├── salesforce-custom-metadata/SKILL.md + references/
│       ├── salesforce-connected-apps/SKILL.md + references/
│       ├── salesforce-prompt-templates/SKILL.md + references/
│       ├── salesforce-flexipages/SKILL.md + references/
│       ├── salesforce-approval-processes/SKILL.md + references/
│       ├── salesforce-global-value-sets/SKILL.md + references/
│       ├── salesforce-custom-permissions/SKILL.md + references/
│       ├── salesforce-assignment-rules/SKILL.md + references/
│       ├── salesforce-applications/SKILL.md + references/
│       ├── salesforce-reports/SKILL.md + references/
│       ├── salesforce-dashboards/SKILL.md + references/
│       ├── salesforce-static-resources/SKILL.md + references/
│       ├── salesforce-named-credentials/SKILL.md + references/
│       └── salesforce-external-credentials/SKILL.md + references/
│
├── generated/
│   └── reference/                ← Output: plain reference docs for non-creatable types
│
├── demo-metadata/               ← Sample SFDX metadata for --demo mode
│   ├── objects/
│   ├── flows/
│   ├── classes/
│   ├── triggers/
│   ├── lwc/
│   ├── permissionsets/
│   ├── profiles/
│   ├── layouts/
│   ├── emailTemplates/
│   ├── customMetadata/
│   ├── connectedApps/
│   ├── genAiPromptTemplates/
│   ├── flexipages/
│   ├── approvalProcesses/
│   ├── globalValueSets/
│   ├── customPermissions/
│   ├── assignmentRules/
│   ├── applications/
│   ├── reports/
│   ├── dashboards/
│   ├── staticresources/
│   ├── namedCredentials/
│   └── externalCredentials/     ← All 23 supported types covered
│
├── scripts/
│   ├── node/
│   │   ├── parsers/
│   │   │   ├── objectParser.js
│   │   │   ├── apexParser.js
│   │   │   ├── flowParser.js
│   │   │   ├── lwcParser.js
│   │   │   ├── permsetParser.js
│   │   │   ├── profileParser.js
│   │   │   ├── layoutParser.js
│   │   │   ├── templateParser.js
│   │   │   ├── customMetadataParser.js
│   │   │   ├── connectedAppParser.js
│   │   │   ├── genAiPromptTemplateParser.js
│   │   │   ├── flexipageParser.js
│   │   │   ├── approvalProcessParser.js
│   │   │   ├── globalValueSetParser.js
│   │   │   ├── customPermissionsParser.js
│   │   │   ├── assignmentRulesParser.js
│   │   │   ├── applicationParser.js
│   │   │   ├── reportParser.js
│   │   │   ├── dashboardParser.js
│   │   │   ├── staticResourceParser.js
│   │   │   ├── namedCredentialParser.js
│   │   │   ├── externalCredentialParser.js
│   │   │   └── genericParser.js      ← fallback for any type without a dedicated parser
│   │   └── generator.js
│   └── python/
│       ├── __init__.py
│       ├── generator.py
│       └── parsers/
│           ├── __init__.py
│           ├── object_parser.py
│           ├── flow_parser.py
│           ├── apex_parser.py
│           ├── lwc_parser.py
│           ├── permset_parser.py
│           ├── profile_parser.py
│           ├── layout_parser.py
│           ├── template_parser.py
│           ├── custom_metadata_parser.py
│           ├── connected_app_parser.py
│           ├── gen_ai_prompt_template_parser.py
│           ├── flexipage_parser.py
│           ├── approval_process_parser.py
│           ├── global_value_set_parser.py
│           ├── custom_permissions_parser.py
│           ├── assignment_rules_parser.py
│           ├── application_parser.py
│           ├── report_parser.py
│           ├── dashboard_parser.py
│           ├── static_resource_parser.py
│           ├── named_credential_parser.py
│           ├── external_credential_parser.py
│           └── generic_parser.py      ← fallback for any type without a dedicated parser
│
└── SKILL.md                     ← Static skill: how to use this tool with Claude
```

---

## Key commands

| Command | Purpose |
|---|---|
| `./retrieve.sh` | Log in to org → retrieve metadata into `src/` → run forge (all in one) |
| `./retrieve.sh --skip-forge` | Log in + retrieve only, skip the forge step |
| `./retrieve.sh --alias my-org` | Override the org alias on the command line |
| `npm run retrieve` | Same as `./retrieve.sh` via npm |
| `./forge.sh` | Run the forge step against `src/` |
| `./forge.sh --demo` | Run against bundled `demo-metadata/` |
| `./forge.sh --dry-run` | Preview skill output without writing files |
| `npm run forge` | Same as above via npm |
| `npm run forge:demo` | Demo mode via npm |
| `npm run forge:dry` | Dry-run via npm |
| `npm run forge:demo:dry` | Demo + dry-run via npm |
| `npm run forge:python` | Python runtime via npm |
| `npm run forge:python:demo` | Python demo mode via npm |
| `npm run forge:python:dry` | Python dry-run via npm |
| `python forge.py` | Python equivalent of forge.sh |
| `python forge.py --demo` | Python demo mode |

### MCP

`.mcp.json` runs the official Salesforce DX MCP Server (`npx -y @salesforce/mcp@0.30.14 --orgs <alias>`) for live org queries — independent of the forge scripts, no changes needed to `forge.js`/`forge.py`. The version is pinned deliberately since `npx -y` executes code fetched from the npm registry at run time; bump it intentionally rather than tracking `latest`. Update the `--orgs` value to match an authenticated org alias before relying on it.

---

## org-config.json

Controls the org name stamped into generated skills, which metadata types get a dedicated parser, and parser behaviour:

```json
{
  "orgName": "My Org",
  "orgAlias": "my-alias",
  "srcDir": "src",
  "outputDir": "generated",
  "metadataTypes": ["objects", "flows", "classes", "triggers", "lwc", "permissionsets", "profiles", "layouts", "emailTemplates", "customMetadata", "connectedApps", "genAiPromptTemplates", "flexipages", "approvalProcesses", "globalValueSets", "customPermissions", "assignmentRules", "applications", "reports", "dashboards", "staticresources", "namedCredentials", "externalCredentials"],
  "skillFormat": "agent-skills",
  "useDemoIfSrcEmpty": true
}
```

The `--demo` flag overrides `srcDir` to point at `demo-metadata/`. `orgAlias` should match the `--orgs` value in `.mcp.json`. Any `src/` subdirectory not listed in `metadataTypes` is still picked up automatically via the generic parser — it doesn't need a config entry.

---

## Parser modules

Each parser is a thin wrapper around stdlib XML extraction (regex-based, no external deps):

| Parser | Input | Key output fields | Tier |
|---|---|---|---|
| objectParser | `objects/*/` | apiName, label, fields[{apiName, type, required}], validationRules, recordTypes | Skill |
| apexParser | `classes/`, `triggers/` | classes[{name, isTest, sharing}], triggers[{name, object, events}] | Skill |
| flowParser | `flows/*.flow-meta.xml` | apiName, processType, triggerType, object | Skill |
| lwcParser | `lwc/*/` | name, files, hasApexWire, hasLds | Skill |
| permsetParser | `permissionsets/*.permissionset-meta.xml` | apiName, label, objectPerms, fieldPerms | Skill |
| profileParser | `profiles/*.profile-meta.xml` | name | Skill |
| layoutParser | `layouts/*.layout-meta.xml` | name | Skill |
| templateParser | `emailTemplates/*.email-meta.xml` | name, subject, encoding | Skill |
| customMetadataParser | `customMetadata/*.md-meta.xml` | fullName, typeName, recordName, label, protected, fields[{field, value}] | Skill |
| connectedAppParser | `connectedApps/*.connectedApp-meta.xml` | apiName, label, contactEmail, scopes | Skill |
| genAiPromptTemplateParser | `genAiPromptTemplates/*.genAiPromptTemplate-meta.xml` | apiName, masterLabel, templateType, content | Skill |
| flexipageParser | `flexipages/*.flexipage-meta.xml` | apiName, masterLabel, type, sobjectType | Skill |
| approvalProcessParser | `approvalProcesses/*.approvalProcess-meta.xml` | fullName, entity, label, active | Skill |
| globalValueSetParser | `globalValueSets/*.globalValueSet-meta.xml` | valueSets[{apiName, masterLabel, sorted, values}] | Skill |
| customPermissionsParser | `customPermissions/*.customPermission-meta.xml` | permissions[{apiName, label, description, isSessionActivated}] | Skill |
| assignmentRulesParser | `assignmentRules/*.assignmentRules-meta.xml` | rulesets[{object, activeRules, totalRules, rules}] | Skill |
| applicationParser | `applications/*.app-meta.xml` | apps[{apiName, label, description, navType}] | Skill |
| reportParser | `reports/**/*.report-meta.xml` | reports[{name, reportType, format, description}] | Skill |
| dashboardParser | `dashboards/**/*.dashboard-meta.xml` | dashboards[{name, title, description}] | Skill |
| staticResourceParser | `staticresources/*.resource-meta.xml` | resources[{apiName, contentType, cacheControl}] | Skill |
| namedCredentialParser | `namedCredentials/*.namedCredential-meta.xml` | credentials[{apiName, label, endpoint, principalType, protocol}] | Skill |
| externalCredentialParser | `externalCredentials/*.externalCredential-meta.xml` | credentials[{apiName, label, description, authenticationProtocol}] | Skill |
| genericParser | any `*-meta.xml` (recursive) | apiName, label, fullName, description | Reference (fallback for any type without a dedicated parser above) |

---

## Generator

`scripts/node/generator.js` and `scripts/python/generator.py` export:

- **Node:** `generateSkill(metadataType, parsed, config) → { skillMd, referenceMd }`, `generateReference(metadataType, parsed, config) → string`, `isSkillType(metadataType) → boolean`, `skillNameFor(metadataType) → string|null`
- **Python:** `generate_skill(metadata_type, parsed, config) -> dict`, `generate_reference(metadata_type, parsed, config) -> str`, `is_skill_type(metadata_type) -> bool`, `skill_name_for(metadata_type) -> str | None`

For Tier-1 (creatable) types, `generateSkill`/`generate_skill` returns `{skillMd, referenceMd}`, written to `.claude/skills/<skillName>/SKILL.md` and `.claude/skills/<skillName>/references/<slug>-reference.md`. `classes` and `triggers` share the `salesforce-apex` skill — the forge entry points parse both and merge their array fields before calling the generator once, so the second type parsed never overwrites the first's `SKILL.md`. For Tier-2 (reference-only) types, `generateReference`/`generate_reference` returns a single Markdown string written to `generated/reference/<slug>.md`.

---

## How Claude should behave in this project

### When asked to CREATE Salesforce metadata

1. Check if `.claude/skills/` contains a relevant skill (e.g. `.claude/skills/salesforce-objects/SKILL.md` before creating a new object) — Claude Code auto-loads these, so they may already be in context.
2. Read the skill's `references/<type>-reference.md` for the full org-specific inventory (real naming conventions, field type patterns, sharing models, design rules) if more detail is needed than the `SKILL.md` summary provides.
3. Generate SFDX source-format XML or Apex that follows the patterns found in those files — not generic Salesforce defaults.
4. Place generated files in the correct SFDX directory structure under `src/` (or in a path the user specifies).
5. If the skill seems stale or the org may have changed since the last forge, cross-check current state via the MCP tools configured in `.mcp.json` rather than assuming the skill is current.

### When asked to FORGE (parse existing metadata)

1. Check `org-config.json` for the source directory and `metadataTypes` list.
2. Run the relevant dedicated parser for each listed type against the source directory; any other subdirectory found in `src/` is parsed generically and treated as Tier 2.
3. Call `generateSkill`/`generate_skill` for Tier-1 types (writing `.claude/skills/<name>/SKILL.md` + `references/`), or `generateReference`/`generate_reference` for Tier-2 types (writing `generated/reference/<type>.md`).
4. `classes` and `triggers` must be merged before generating — see the Generator section above.

### When adding a new metadata type

1. Add a parser in both `scripts/node/parsers/` and `scripts/python/parsers/` (or rely on the generic fallback if a dedicated parser isn't worth building).
2. To promote it to a full skill (Tier 1), register it in the `SKILL_REGISTRY`/`_SKILL_REGISTRY` map in `generator.js`/`generator.py` with a `skillName` and a builder function returning `{skillMd, referenceMd}`.
3. Add the new type's parser to the `PARSERS` map in `forge.js`/`forge.py`, and add the type to `metadataTypes` in `org-config.json`.
4. If it's left out of `metadataTypes`/`PARSERS` entirely, it still gets picked up automatically as a Tier-2 reference doc via the generic-parser auto-detect pass — no registration required for that path.

### Code standards for this repo

- Node.js files: `'use strict'`, CommonJS `require`/`module.exports`, async functions, no external npm dependencies
- Python files: stdlib only (`re`, `os`, `pathlib`), type hints encouraged, docstrings on public functions
- All XML in `demo-metadata/`: valid SFDX source format with `xmlns="http://soap.sforce.com/2006/04/metadata"`
- No build step required — this is a plain Node.js / Python scripting tool

---

## Static skill files (read-only reference)

These files in the project root are manually maintained skills that Claude loads when working in different modes:

- `SKILL.md` — top-level skill: how to use this forge tool
- `forge.md` — forge workflow details
- `create.md` — create workflow details  
- `objects.md` — object/field creation patterns
- `classes.md` — Apex class patterns
