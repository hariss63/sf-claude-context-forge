# Skill: Running the forge

## When to use this skill
Load this skill when the developer asks to run the forge, regenerate skills, or wants to understand how to use this tool.

## How to run the forge

### All-in-one: retrieve metadata + forge (recommended for first use)
```bash
chmod +x retrieve.sh
./retrieve.sh
# or: npm run retrieve
```
This logs you into your org, pulls metadata into `src/`, then runs the forge automatically.

### Forge only (when src/ already has metadata)

### Universal (auto-detects runtime)
```bash
./forge.sh
```

### Node.js
```bash
npm install
npm run forge
```

### Python
```bash
pip install -r requirements.txt
python forge.py
```

### With demo metadata (no src/ needed)
```bash
./forge.sh --demo
```

### Dry run (preview without writing files)
```bash
./forge.sh --dry-run
```

## What the forge produces
After running, `.claude/skills/` will contain one native Agent Skill (`SKILL.md` + `references/<type>-reference.md`) per creatable metadata type found in `src/` — 23 types get a dedicated parser (objects, flows, classes+triggers, lwc, permissionsets, profiles, layouts, emailTemplates, customMetadata, connectedApps, genAiPromptTemplates, flexipages, approvalProcesses, globalValueSets, customPermissions, assignmentRules, applications, reports, dashboards, staticresources, namedCredentials, externalCredentials). Any other metadata type present in `src/` is picked up automatically via a generic parser and written as a plain reference doc to `generated/reference/<type>.md` instead — no config entry required. Each skill teaches Claude:
- The naming conventions used in this org
- The metadata patterns and structures in use
- Design rules for creating new metadata of that type

Skills under `.claude/skills/` are auto-loaded by Claude Code — there's no push/copy step.

## Troubleshooting
- **src/ is empty** → forge automatically uses `demo-metadata/` if `useDemoIfSrcEmpty` is true in `org-config.json`
- **Missing metadata type** → check that the folder exists in `src/` (e.g. `src/flows/`); if it's not one of the 23 dedicated types, it should still show up as a reference doc rather than being skipped
- **Node not found** → forge.sh falls back to Python automatically
- **Permission denied on forge.sh** → run `chmod +x forge.sh`

## After forging
Skills in `.claude/skills/` are live immediately — open (or reload) Claude Code in this project and they're available. For a tighter loop, connect `.mcp.json` (the official Salesforce DX MCP Server) to your org so Claude can cross-check live state alongside the forged skills; see the "Live org queries via MCP" workflow in `CLAUDE.md`.
