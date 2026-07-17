# sf-claude-context-forge

> Turn your Salesforce org metadata into Claude Agent Skills — and use those skills, plus live org access via MCP, to generate new metadata that matches your org's exact patterns.

---

## What is this?

`sf-claude-context-forge` is an open-source tool for Salesforce developers using Claude Code. It does three things:

**Workflow 1 — Forge skills from your org**
Drop your SFDX metadata into `src/`. Run one command. The forge reads every metadata type it can find — 14 metadata types get a dedicated parser, everything else falls back to a generic parser — and writes native Claude Agent Skills into `.claude/skills/`, auto-loaded by Claude Code the moment you open this project. Low-value config metadata (certs, CORS origins, auth providers, etc.) gets a plain reference doc under `generated/reference/` instead of a full skill.

**Workflow 2 — Generate new metadata using your org as the pattern**
With the skills auto-loaded, describe what you want in plain English. Claude reads the relevant skill and produces new Apex classes, Flows, LWC components, custom objects, Custom Metadata records, Connected Apps, Prompt Builder templates, FlexiPages, Approval Processes, and more — built to match your org's exact style, not a generic template.

**Workflow 3 — Query your live org via MCP**
`.mcp.json` wires up the official [Salesforce DX MCP Server](https://github.com/salesforcecli/mcp) (`@salesforce/mcp`), giving Claude live org query tools (describe objects, run SOQL, etc.) alongside the static skills from the forge step.

---

## Quick start

### Prerequisites
- Node.js 18+ or Python 3.10+
- Salesforce CLI (`sf`) installed
- Claude Code installed

### 1. Clone the repo
```bash
git clone https://github.com/your-org/sf-claude-context-forge.git
cd sf-claude-context-forge
```

### 2. Add your metadata
Retrieve your SFDX metadata and place it in `src/`:
```bash
sf project retrieve start --target-org your-alias --output-dir src/
```
Or try the included demo metadata first — it works out of the box.

### 3. Run the forge

**Option A — Node.js**
```bash
npm install
npm run forge
```

**Option B — Python**
```bash
pip install -r requirements.txt
python forge.py
```

**Option C — Shell (auto-detects Node or Python)**
```bash
chmod +x forge.sh
./forge.sh
```

### 4. Review generated skills
Skills land directly in `.claude/skills/<skill-name>/SKILL.md` (with an inventory in `references/`) — no manual copy step. Reference-only docs for non-creatable metadata land in `generated/reference/`.

### 5. Connect live org access (optional but recommended)
Update `.mcp.json`'s `--orgs` value to your authenticated org alias (matching `orgAlias` in `org-config.json`), so Claude can query the live org in addition to reading the forged skills.

### 6. Use skills in Claude Code
Open Claude Code in this project — the skills under `.claude/skills/` load automatically. Now you can say:
```
Create a trigger on the Contact object that follows our existing Apex patterns
Build a Flow for Case escalation using our org's routing conventions
Create a new custom object for tracking Supplier Agreements with the same structure as our existing objects
Add a Custom Metadata record for a new integration endpoint, following our existing records
```

---

## Repo structure

```
sf-claude-context-forge/
├── src/                          # Your SFDX metadata goes here
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
│   └── ...any other retrieved metadata type (auto-detected, generic parser)
│
├── demo-metadata/                # Sample metadata — works out of the box
│
├── scripts/
│   ├── node/                     # Node.js parsers and generator
│   └── python/                   # Python parsers and generator
│
├── .claude/
│   └── skills/                   # Output — auto-loaded Claude Agent Skills
│       ├── salesforce-objects/
│       │   ├── SKILL.md
│       │   └── references/objects-reference.md
│       ├── salesforce-apex/
│       ├── salesforce-flows/
│       ├── salesforce-lwc/
│       ├── salesforce-permission-sets/
│       ├── salesforce-profiles/
│       ├── salesforce-layouts/
│       ├── salesforce-email-templates/
│       ├── salesforce-custom-metadata/
│       ├── salesforce-connected-apps/
│       ├── salesforce-prompt-templates/
│       ├── salesforce-flexipages/
│       └── salesforce-approval-processes/
│
├── generated/
│   └── reference/                # Output — plain reference docs for non-creatable types
│
├── skills/                       # Static Claude skills (always loaded)
│   ├── SKILL.md                  # Master skill — forge overview
│   ├── forge.md                  # Skill: how to run the forge
│   └── create.md                 # Skill: how to create new metadata
│
├── .mcp.json                     # Live org access via @salesforce/mcp
├── org-config.json               # Per-org configuration
├── forge.sh                      # Universal entry point
├── forge.js                      # Node.js entry point
├── forge.py                      # Python entry point
├── package.json
├── requirements.txt
└── .github/
    └── workflows/
        └── forge.yml             # GitHub Actions — auto-forge on push
```

---

## org-config.json

Configure the forge for your org:
```json
{
  "orgName": "My Org",
  "orgAlias": "my-alias",
  "srcDir": "src",
  "outputDir": "generated",
  "metadataTypes": [
    "objects", "flows", "classes", "triggers", "lwc",
    "permissionsets", "profiles", "layouts", "emailTemplates",
    "customMetadata", "connectedApps", "genAiPromptTemplates",
    "flexipages", "approvalProcesses"
  ],
  "skillFormat": "agent-skills",
  "dryRun": false,
  "useDemoIfSrcEmpty": true
}
```

`orgAlias` should match the `--orgs` value in `.mcp.json` so the static skills and the live MCP queries point at the same org.

Anything retrieved into `src/` that isn't listed in `metadataTypes` above is still picked up automatically — it's parsed generically and written to `generated/reference/<type>.md` rather than a full skill, since there's no realistic "create a new one of these" workflow for things like certs or CORS origins.

---

## How the generated skills work

Each `.claude/skills/<name>/SKILL.md` teaches Claude one metadata type's conventions from **your** org — naming patterns, design rules, and when to use it — and points to `references/<type>-reference.md` for the full org-specific inventory (real object/class/flow names, field types, etc.). Claude Code auto-loads `SKILL.md` files under `.claude/skills/`, so no manual step is needed to make a skill available once it's forged.

---

## MCP: live org access

`.mcp.json` configures the official [Salesforce DX MCP Server](https://github.com/salesforcecli/mcp):
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp", "--orgs", "your-alias"]
    }
  }
}
```
This is independent of the forge scripts (which stay dependency-free) — it just gives Claude live query tools (describe objects, run SOQL, etc.) for the org named in `--orgs`, on top of whatever's been forged into skills from the last `src/` retrieve.

Recommended loop: authenticate (`sf org login web --alias your-alias`) → retrieve into `src/` → run the forge → skills refresh → ask Claude to build, optionally cross-checking live state via the MCP tools.

---

## Contributing

This is an open-source project. PRs welcome for:
- New metadata type parsers (dedicated, richer than the generic fallback)
- Better skill templates
- CI/CD integrations
- Additional output formats (JSON knowledge base, plain text)

---

## License

MIT
