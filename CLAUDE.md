# sf-claude-context-forge

## What this project does

sf-claude-context-forge is a code-generation scaffold for Salesforce developers working with Claude Code. It operates in two phases:

1. **Forge phase** — reads real Salesforce SFDX metadata from `src/` (or `demo-metadata/`), parses it, and generates Claude-ready Markdown skill files in `generated/`. These skill files teach Claude the org's actual naming conventions, object model, Apex patterns, Flow structures, and component architecture.

2. **Create phase** — once Claude has loaded the generated skills, you ask it to create new Salesforce metadata (objects, fields, Apex classes, Flows, LWC components) and it follows the org's real patterns automatically instead of generating generic boilerplate.

The bridge between phases is `generated/`. The forge step writes it; the create step reads it.

---

## Workflows

### Workflow 1: Forge — src/ → generated/

```
./forge.sh
# or
npm run forge
# or
python forge.py
```

This reads metadata from `src/` (your SFDX project source) and writes skill Markdown files into `generated/`.

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

After forging:
1. Load the relevant generated skill files (e.g. `/generated/objects.md`, `/generated/classes.md`)
2. Ask Claude to generate new metadata: "Create a custom object called Vendor__c with fields for Rating and ContractValue"
3. Claude uses the org's conventions from the skill files to produce correct, consistent SFDX source-format XML and Apex

---

## Directory structure

```
sf-claude-context-forge/
├── CLAUDE.md                    ← this file
├── forge.js                     ← Node.js entry point
├── forge.py                     ← Python entry point
├── forge.sh                     ← Shell entry point (wraps Node or Python)
├── org-config.json              ← Org name and preferences
├── package.json                 ← npm scripts
├── requirements.txt             ← Python deps (stdlib only)
│
├── src/                         ← Your SFDX metadata goes here (gitkeep placeholder)
│   └── .gitkeep
│
├── generated/                   ← Output: Claude skill Markdown files
│   └── .gitkeep
│
├── demo-metadata/               ← Sample SFDX metadata for --demo mode
│   ├── objects/
│   │   ├── Account__c/          ← Supplier Account custom object
│   │   └── Project__c/          ← Project custom object
│   ├── flows/
│   │   ├── Project_Status_Notification.flow-meta.xml
│   │   └── Case_Escalation.flow-meta.xml
│   ├── classes/
│   │   ├── ProjectTriggerHandler.cls
│   │   ├── ProjectTriggerHandler_Test.cls
│   │   └── ProjectService.cls
│   ├── triggers/
│   │   └── ProjectTrigger.trigger
│   └── lwc/
│       └── projectSummary/      ← LWC using @wire and LDS
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
│   │   │   └── templateParser.js
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
│           └── template_parser.py
│
└── SKILL.md                     ← Static skill: how to use this tool with Claude
```

---

## Key commands

| Command | Purpose |
|---|---|
| `./forge.sh` | Run the forge step against `src/` |
| `./forge.sh --demo` | Run against bundled `demo-metadata/` |
| `./forge.sh --dry-run` | Preview skill output without writing files |
| `npm run forge` | Same as above via npm |
| `npm run forge:demo` | Demo mode via npm |
| `python forge.py` | Python equivalent of forge.sh |
| `python forge.py --demo` | Python demo mode |

---

## org-config.json

Controls the org name stamped into generated skill files and parser behaviour:

```json
{
  "orgName": "My Org",
  "sourceDir": "src",
  "outputDir": "generated"
}
```

The `--demo` flag overrides `sourceDir` to point at `demo-metadata/`.

---

## Parser modules

Each parser is a thin wrapper around stdlib XML extraction (regex-based, no external deps):

| Parser | Input | Key output fields |
|---|---|---|
| objectParser | `objects/*/` | apiName, label, fields[{apiName, type, required}] |
| apexParser | `classes/`, `triggers/` | classes[{name, isTest, sharing}], triggers[{name, object, events}] |
| flowParser | `flows/*.flow-meta.xml` | apiName, processType, triggerType, object |
| lwcParser | `lwc/*/` | name, files, hasApexWire, hasLds |
| permsetParser | `permissionsets/*.permissionset-meta.xml` | apiName, label, objectPerms, fieldPerms |
| profileParser | `profiles/*.profile-meta.xml` | name |
| layoutParser | `layouts/*.layout-meta.xml` | name |
| templateParser | `emailTemplates/*.email-meta.xml` | name, subject, encoding |

---

## Generator

`scripts/node/generator.js` and `scripts/python/generator.py` both export a single function:

- **Node:** `generateSkill(metadataType, parsed, config) → string`
- **Python:** `generate_skill(metadata_type, parsed, config) → str`

Each call produces one Markdown skill file. The forge entry points call the generator once per metadata type and write the result to `generated/{type}.md`.

---

## How Claude should behave in this project

### When asked to CREATE Salesforce metadata

1. Check if `generated/` contains relevant skill files (e.g. `generated/objects.md` before creating a new object).
2. If skill files exist, read them to understand naming conventions, field type patterns, sharing models, and design rules for this specific org.
3. Generate SFDX source-format XML or Apex that follows the patterns found in those files — not generic Salesforce defaults.
4. Place generated files in the correct SFDX directory structure under `src/` (or in a path the user specifies).

### When asked to FORGE (parse existing metadata)

1. Check `org-config.json` for the source directory.
2. Run the relevant parsers against the source directory.
3. Call the generator for each metadata type.
4. Write output files to `generated/`.

### When adding a new metadata type

1. Add a parser in both `scripts/node/parsers/` and `scripts/python/parsers/`.
2. Register the new type in `generator.js` and `generator.py` builders map.
3. Add the new type to the forge entry points (`forge.js`, `forge.py`).

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
