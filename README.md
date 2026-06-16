# sf-claude-context-forge

> Turn your Salesforce org metadata into Claude-ready skills — and use those skills to generate new metadata that matches your org's exact patterns.

---

## What is this?

`sf-claude-context-forge` is an open-source tool for Salesforce developers using Claude Code. It does two things:

**Workflow 1 — Forge skills from your org**
Drop your SFDX metadata into `src/`. Run one command. The forge reads every metadata type and generates a set of Markdown skill files in `generated/` that teach Claude your org's conventions, naming patterns, field structures, and design decisions.

**Workflow 2 — Generate new metadata using your org as the pattern**
With the skills loaded in Claude Code, describe what you want in plain English. Claude reads your generated skills and produces new Apex classes, Flows, LWC components, custom objects, and more — built to match your org's exact style, not a generic template.

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
Generated skills land in `generated/`. Review them, then copy to your Claude Code skills folder:
```bash
./forge.sh --push   # copies generated/ → ~/.claude/skills/ after review
```

### 5. Use skills in Claude Code
Open Claude Code in your project. Now you can say:
```
Create a trigger on the Contact object that follows our existing Apex patterns
Build a Flow for Case escalation using our org's routing conventions
Create a new custom object for tracking Supplier Agreements with the same structure as our existing objects
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
│   └── emailTemplates/
│
├── demo-metadata/                # Sample metadata — works out of the box
│
├── scripts/
│   ├── node/                     # Node.js parsers and generators
│   └── python/                   # Python parsers and generators
│
├── skills/                       # Static Claude skills (always loaded)
│   ├── SKILL.md                  # Master skill — forge overview
│   ├── forge.md                  # Skill: how to run the forge
│   └── create.md                 # Skill: how to create new metadata
│
├── generated/                    # Output — auto-generated skill files
│   ├── objects/
│   ├── flows/
│   ├── apex/
│   ├── lwc/
│   ├── perms/
│   ├── profiles/
│   ├── layouts/
│   └── templates/
│
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
  "metadataTypes": ["objects", "flows", "classes", "triggers", "lwc", "permissionsets", "profiles", "layouts", "emailTemplates"],
  "skillFormat": "markdown",
  "dryRun": false,
  "pushToClaudeCode": false,
  "claudeSkillsDir": "~/.claude/skills/sf-forge"
}
```

---

## How the generated skills work

Each skill file teaches Claude one metadata type's conventions from **your** org:

- **Naming patterns** — prefixes, suffixes, casing conventions
- **Field structure** — which field types you use, how you name them
- **Design patterns** — trigger frameworks, flow naming, LWC composition style
- **Examples** — real excerpts (sanitized) from your metadata as reference

When you ask Claude to create something new, it reads the relevant skill and mirrors your org's patterns exactly.

---

## Contributing

This is an open-source project. PRs welcome for:
- New metadata type parsers
- Better skill templates
- CI/CD integrations
- Additional output formats (JSON knowledge base, plain text)

---

## License

MIT
