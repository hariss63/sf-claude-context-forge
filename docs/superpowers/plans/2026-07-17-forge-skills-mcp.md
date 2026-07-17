# Full Metadata Coverage, Agent Skills Output, and MCP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand forge's metadata-type coverage beyond the current 9 types, emit native Claude Agent Skills (`SKILL.md` + `references/`) into `.claude/skills/` instead of flat Markdown, and wire up the official Salesforce MCP server for live org queries.

**Architecture:** A generic fallback parser covers any metadata type with no dedicated parser; 5 new dedicated parsers are added for high-value creatable types. The generator becomes two-tier: creatable types produce a full skill directory (`SKILL.md` + `references/<type>-reference.md`), everything else produces a plain reference doc under `generated/reference/`. `forge.js`/`forge.py` auto-detect any `src/` subdirectory not in the dedicated-type list and route it through the generic parser + reference tier — no config entry required for the long tail. MCP is wired as a standalone `.mcp.json` pointing at `@salesforce/mcp`, with no changes to the (dependency-free) forge scripts.

**Tech Stack:** Node.js (stdlib only, CommonJS), Python 3.10+ (stdlib only), Markdown, MCP config JSON.

Reference spec: `docs/superpowers/specs/2026-07-17-forge-skills-mcp-design.md`

**Testing note:** This repo has no test framework (no jest/pytest configured, `package.json` has no test script). Verification steps in this plan run `forge.js`/`forge.py --demo` and inspect the generated output directly, matching the project's existing manual-verification convention rather than introducing a new test dependency.

---

### Task 1: Generic fallback parser (Node + Python)

**Files:**
- Create: `scripts/node/parsers/genericParser.js`
- Create: `scripts/python/parsers/generic_parser.py`

- [ ] **Step 1: Write `scripts/node/parsers/genericParser.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function deriveApiName(fileName) {
  return fileName.replace(/\.[a-zA-Z]+-meta\.xml$/, '');
}

/**
 * Fallback parser used for any metadata type without a dedicated parser.
 * Walks every *-meta.xml file under typeDir (recursively, for nested-folder
 * types) and extracts whatever common fields are present.
 *
 * @param {string} typeDir - path to a metadata type folder (e.g. src/dashboards)
 * @returns {{ items: Array }}
 */
async function parseGeneric(typeDir) {
  const items = [];
  if (!fs.existsSync(typeDir)) return { items };

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('-meta.xml')) {
        const xml = fs.readFileSync(full, 'utf8');
        items.push({
          apiName: deriveApiName(entry.name),
          label: extractTag(xml, 'label') || extractTag(xml, 'masterLabel'),
          fullName: extractTag(xml, 'fullName'),
          description: extractTag(xml, 'description'),
        });
      }
    }
  };

  walk(typeDir);
  return { items };
}

module.exports = { parseGeneric };
```

- [ ] **Step 2: Write `scripts/python/parsers/generic_parser.py`**

```python
"""
generic_parser.py
Fallback parser for any metadata type without a dedicated parser.
Extracts apiName/label/fullName/description from *-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _derive_api_name(file_name: str) -> str:
    return re.sub(r'\.[a-zA-Z]+-meta\.xml$', '', file_name)


def parse_generic(type_dir: str) -> dict:
    """Walk every *-meta.xml file under type_dir and extract common fields."""
    items = []
    root = Path(type_dir)
    if not root.exists():
        return {'items': items}

    for file in sorted(root.rglob('*-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        items.append({
            'apiName': _derive_api_name(file.name),
            'label': _extract_tag(xml, 'label') or _extract_tag(xml, 'masterLabel'),
            'fullName': _extract_tag(xml, 'fullName'),
            'description': _extract_tag(xml, 'description'),
        })

    return {'items': items}
```

- [ ] **Step 3: Verify by hand**

Run:
```bash
node -e "require('./scripts/node/parsers/genericParser').parseGeneric('demo-metadata/flows').then(r => console.log(JSON.stringify(r, null, 2)))"
```
Expected: prints `{ "items": [...] }` with one entry per `.flow-meta.xml` file in `demo-metadata/flows`.

```bash
python3 -c "import sys; sys.path.insert(0, 'scripts/python'); from parsers.generic_parser import parse_generic; import json; print(json.dumps(parse_generic('demo-metadata/flows'), indent=2))"
```
Expected: same shape of output.

- [ ] **Step 4: Commit**

```bash
git add scripts/node/parsers/genericParser.js scripts/python/parsers/generic_parser.py
git commit -m "Add generic fallback parser for metadata types without a dedicated parser"
```

---

### Task 2: Dedicated parsers — customMetadata and connectedApps (Node + Python)

**Files:**
- Create: `scripts/node/parsers/customMetadataParser.js`
- Create: `scripts/node/parsers/connectedAppParser.js`
- Create: `scripts/python/parsers/custom_metadata_parser.py`
- Create: `scripts/python/parsers/connected_app_parser.py`

- [ ] **Step 1: Write `scripts/node/parsers/customMetadataParser.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function extractAllBlocks(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

/**
 * Reads Custom Metadata Type records from SFDX source format (.md-meta.xml).
 * @param {string} typeDir - path to the customMetadata/ folder
 * @returns {{ records: Array }}
 */
async function parseCustomMetadata(typeDir) {
  const records = [];
  if (!fs.existsSync(typeDir)) return { records };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.md-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    const fullName = file.replace('.md-meta.xml', '');
    const [typeName, recordName] = fullName.split('.');

    const fields = extractAllBlocks(xml, 'values').map(block => ({
      field: extractTag(block, 'field'),
      value: extractTag(block, 'value'),
    }));

    records.push({
      fullName,
      typeName,
      recordName,
      label: extractTag(xml, 'label'),
      protected: extractTag(xml, 'protected') === 'true',
      fields,
    });
  }

  return { records };
}

module.exports = { parseCustomMetadata };
```

- [ ] **Step 2: Write `scripts/node/parsers/connectedAppParser.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

/**
 * Reads Connected App metadata from SFDX source format (.connectedApp-meta.xml).
 * @param {string} typeDir - path to the connectedApps/ folder
 * @returns {{ apps: Array }}
 */
async function parseConnectedApps(typeDir) {
  const apps = [];
  if (!fs.existsSync(typeDir)) return { apps };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.connectedApp-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    apps.push({
      apiName: file.replace('.connectedApp-meta.xml', ''),
      label: extractTag(xml, 'label'),
      contactEmail: extractTag(xml, 'contactEmail'),
      description: extractTag(xml, 'description'),
      scopes: extractAll(xml, 'scopes'),
    });
  }

  return { apps };
}

module.exports = { parseConnectedApps };
```

- [ ] **Step 3: Write `scripts/python/parsers/custom_metadata_parser.py`**

```python
"""
custom_metadata_parser.py
Reads Salesforce Custom Metadata Type records from SFDX source format.
Parses .md-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _extract_all_blocks(xml: str, tag: str) -> list[str]:
    return re.findall(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)


def parse_custom_metadata(type_dir: str) -> dict:
    """Parse all *.md-meta.xml files in a customMetadata/ folder."""
    records = []
    root = Path(type_dir)
    if not root.exists():
        return {'records': records}

    for file in sorted(root.glob('*.md-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        full_name = file.name.replace('.md-meta.xml', '')
        type_name, _, record_name = full_name.partition('.')

        fields = [
            {'field': _extract_tag(block, 'field'), 'value': _extract_tag(block, 'value')}
            for block in _extract_all_blocks(xml, 'values')
        ]

        records.append({
            'fullName': full_name,
            'typeName': type_name,
            'recordName': record_name,
            'label': _extract_tag(xml, 'label'),
            'protected': _extract_tag(xml, 'protected') == 'true',
            'fields': fields,
        })

    return {'records': records}
```

- [ ] **Step 4: Write `scripts/python/parsers/connected_app_parser.py`**

```python
"""
connected_app_parser.py
Reads Salesforce Connected App metadata from SFDX source format.
Parses .connectedApp-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _extract_all(xml: str, tag: str) -> list[str]:
    return [v.strip() for v in re.findall(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)]


def parse_connected_apps(type_dir: str) -> dict:
    """Parse all *.connectedApp-meta.xml files in a connectedApps/ folder."""
    apps = []
    root = Path(type_dir)
    if not root.exists():
        return {'apps': apps}

    for file in sorted(root.glob('*.connectedApp-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        apps.append({
            'apiName': file.name.replace('.connectedApp-meta.xml', ''),
            'label': _extract_tag(xml, 'label'),
            'contactEmail': _extract_tag(xml, 'contactEmail'),
            'description': _extract_tag(xml, 'description'),
            'scopes': _extract_all(xml, 'scopes'),
        })

    return {'apps': apps}
```

- [ ] **Step 5: Commit**

```bash
git add scripts/node/parsers/customMetadataParser.js scripts/node/parsers/connectedAppParser.js scripts/python/parsers/custom_metadata_parser.py scripts/python/parsers/connected_app_parser.py
git commit -m "Add dedicated parsers for customMetadata and connectedApps"
```

---

### Task 3: Dedicated parsers — genAiPromptTemplates, flexipages, approvalProcesses (Node + Python)

**Files:**
- Create: `scripts/node/parsers/genAiPromptTemplateParser.js`
- Create: `scripts/node/parsers/flexipageParser.js`
- Create: `scripts/node/parsers/approvalProcessParser.js`
- Create: `scripts/python/parsers/gen_ai_prompt_template_parser.py`
- Create: `scripts/python/parsers/flexipage_parser.py`
- Create: `scripts/python/parsers/approval_process_parser.py`

- [ ] **Step 1: Write `scripts/node/parsers/genAiPromptTemplateParser.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads GenAI Prompt Template (Prompt Builder / Agentforce) metadata.
 * @param {string} typeDir - path to the genAiPromptTemplates/ folder
 * @returns {{ templates: Array }}
 */
async function parseGenAiPromptTemplates(typeDir) {
  const templates = [];
  if (!fs.existsSync(typeDir)) return { templates };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.genAiPromptTemplate-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    templates.push({
      apiName: file.replace('.genAiPromptTemplate-meta.xml', ''),
      masterLabel: extractTag(xml, 'masterLabel'),
      templateType: extractTag(xml, 'templateType'),
      description: extractTag(xml, 'description'),
      content: extractTag(xml, 'content'),
    });
  }

  return { templates };
}

module.exports = { parseGenAiPromptTemplates };
```

- [ ] **Step 2: Write `scripts/node/parsers/flexipageParser.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads FlexiPage (Lightning App Builder) metadata.
 * @param {string} typeDir - path to the flexipages/ folder
 * @returns {{ pages: Array }}
 */
async function parseFlexipages(typeDir) {
  const pages = [];
  if (!fs.existsSync(typeDir)) return { pages };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.flexipage-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    pages.push({
      apiName: file.replace('.flexipage-meta.xml', ''),
      masterLabel: extractTag(xml, 'masterLabel'),
      type: extractTag(xml, 'type'),
      sobjectType: extractTag(xml, 'sobjectType'),
    });
  }

  return { pages };
}

module.exports = { parseFlexipages };
```

- [ ] **Step 3: Write `scripts/node/parsers/approvalProcessParser.js`**

```js
'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Approval Process metadata.
 * @param {string} typeDir - path to the approvalProcesses/ folder
 * @returns {{ processes: Array }}
 */
async function parseApprovalProcesses(typeDir) {
  const processes = [];
  if (!fs.existsSync(typeDir)) return { processes };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.approvalProcess-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    const fullName = file.replace('.approvalProcess-meta.xml', '');
    const entity = fullName.split('.')[0];

    processes.push({
      fullName,
      entity,
      label: extractTag(xml, 'label'),
      active: extractTag(xml, 'active') === 'true',
      description: extractTag(xml, 'description'),
    });
  }

  return { processes };
}

module.exports = { parseApprovalProcesses };
```

- [ ] **Step 4: Write `scripts/python/parsers/gen_ai_prompt_template_parser.py`**

```python
"""
gen_ai_prompt_template_parser.py
Reads Salesforce GenAI Prompt Template (Prompt Builder) metadata from SFDX source format.
Parses .genAiPromptTemplate-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_gen_ai_prompt_templates(type_dir: str) -> dict:
    """Parse all *.genAiPromptTemplate-meta.xml files in a genAiPromptTemplates/ folder."""
    templates = []
    root = Path(type_dir)
    if not root.exists():
        return {'templates': templates}

    for file in sorted(root.glob('*.genAiPromptTemplate-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        templates.append({
            'apiName': file.name.replace('.genAiPromptTemplate-meta.xml', ''),
            'masterLabel': _extract_tag(xml, 'masterLabel'),
            'templateType': _extract_tag(xml, 'templateType'),
            'description': _extract_tag(xml, 'description'),
            'content': _extract_tag(xml, 'content'),
        })

    return {'templates': templates}
```

- [ ] **Step 5: Write `scripts/python/parsers/flexipage_parser.py`**

```python
"""
flexipage_parser.py
Reads Salesforce FlexiPage (Lightning App Builder) metadata from SFDX source format.
Parses .flexipage-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_flexipages(type_dir: str) -> dict:
    """Parse all *.flexipage-meta.xml files in a flexipages/ folder."""
    pages = []
    root = Path(type_dir)
    if not root.exists():
        return {'pages': pages}

    for file in sorted(root.glob('*.flexipage-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        pages.append({
            'apiName': file.name.replace('.flexipage-meta.xml', ''),
            'masterLabel': _extract_tag(xml, 'masterLabel'),
            'type': _extract_tag(xml, 'type'),
            'sobjectType': _extract_tag(xml, 'sobjectType'),
        })

    return {'pages': pages}
```

- [ ] **Step 6: Write `scripts/python/parsers/approval_process_parser.py`**

```python
"""
approval_process_parser.py
Reads Salesforce Approval Process metadata from SFDX source format.
Parses .approvalProcess-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_approval_processes(type_dir: str) -> dict:
    """Parse all *.approvalProcess-meta.xml files in an approvalProcesses/ folder."""
    processes = []
    root = Path(type_dir)
    if not root.exists():
        return {'processes': processes}

    for file in sorted(root.glob('*.approvalProcess-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        full_name = file.name.replace('.approvalProcess-meta.xml', '')
        entity = full_name.split('.')[0]

        processes.append({
            'fullName': full_name,
            'entity': entity,
            'label': _extract_tag(xml, 'label'),
            'active': _extract_tag(xml, 'active') == 'true',
            'description': _extract_tag(xml, 'description'),
        })

    return {'processes': processes}
```

- [ ] **Step 7: Commit**

```bash
git add scripts/node/parsers/genAiPromptTemplateParser.js scripts/node/parsers/flexipageParser.js scripts/node/parsers/approvalProcessParser.js scripts/python/parsers/gen_ai_prompt_template_parser.py scripts/python/parsers/flexipage_parser.py scripts/python/parsers/approval_process_parser.py
git commit -m "Add dedicated parsers for genAiPromptTemplates, flexipages, approvalProcesses"
```

---

### Task 4: Rewrite the generator — two-tier output (Node + Python)

**Files:**
- Modify: `scripts/node/generator.js` (full rewrite)
- Modify: `scripts/python/generator.py` (full rewrite)

**Contract:** `generateSkill(type, parsed, config)` now returns `{ skillMd, referenceMd }` for the 14 Tier-1 (creatable) types, each producing `SKILL.md` frontmatter (`name`/`description`) plus a short instructions body, with the inventory dump moved into `referenceMd`. A new `generateReference(type, parsed, config)` returns a single Markdown string for Tier-2 types (built from the generic parser's `{ items }` shape). `isSkillType(type)` and `skillNameFor(type)` let the orchestrator route each metadata type to the right tier and destination.

Tier-1 registry (skill directory name ← metadata type): `salesforce-objects` ← objects, `salesforce-flows` ← flows, `salesforce-apex` ← classes & triggers, `salesforce-lwc` ← lwc, `salesforce-permission-sets` ← permissionsets, `salesforce-profiles` ← profiles, `salesforce-layouts` ← layouts, `salesforce-email-templates` ← emailTemplates, `salesforce-custom-metadata` ← customMetadata, `salesforce-connected-apps` ← connectedApps, `salesforce-prompt-templates` ← genAiPromptTemplates, `salesforce-flexipages` ← flexipages, `salesforce-approval-processes` ← approvalProcesses.

- [ ] **Step 1: Replace `scripts/node/generator.js` in full**

```js
/**
 * generator.js
 * Converts parsed metadata into Claude Agent Skills (SKILL.md + references/)
 * for creatable metadata types, or plain reference Markdown for everything else.
 */

'use strict';

function frontmatter(name, description) {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n`;
}

const SKILL_REGISTRY = {
  objects:              { skillName: 'salesforce-objects',            builder: buildObjectsSkill },
  flows:                { skillName: 'salesforce-flows',              builder: buildFlowsSkill },
  classes:              { skillName: 'salesforce-apex',               builder: buildApexSkill },
  triggers:             { skillName: 'salesforce-apex',               builder: buildApexSkill },
  lwc:                  { skillName: 'salesforce-lwc',                builder: buildLwcSkill },
  permissionsets:       { skillName: 'salesforce-permission-sets',    builder: buildPermsetSkill },
  profiles:             { skillName: 'salesforce-profiles',           builder: buildProfileSkill },
  layouts:              { skillName: 'salesforce-layouts',            builder: buildLayoutSkill },
  emailTemplates:       { skillName: 'salesforce-email-templates',    builder: buildTemplateSkill },
  customMetadata:       { skillName: 'salesforce-custom-metadata',    builder: buildCustomMetadataSkill },
  connectedApps:        { skillName: 'salesforce-connected-apps',     builder: buildConnectedAppSkill },
  genAiPromptTemplates: { skillName: 'salesforce-prompt-templates',   builder: buildPromptTemplateSkill },
  flexipages:           { skillName: 'salesforce-flexipages',         builder: buildFlexipageSkill },
  approvalProcesses:    { skillName: 'salesforce-approval-processes', builder: buildApprovalProcessSkill },
};

function isSkillType(metadataType) {
  return Object.prototype.hasOwnProperty.call(SKILL_REGISTRY, metadataType);
}

function skillNameFor(metadataType) {
  const entry = SKILL_REGISTRY[metadataType];
  return entry ? entry.skillName : null;
}

/**
 * @param {string} metadataType - e.g. 'objects', 'flows', 'classes'
 * @param {object} parsed       - output from the relevant parser
 * @param {object} config       - org-config.json contents
 * @returns {{ skillMd: string, referenceMd: string }}
 */
function generateSkill(metadataType, parsed, config) {
  const entry = SKILL_REGISTRY[metadataType];
  if (!entry) {
    throw new Error(`No skill builder registered for metadata type: ${metadataType}`);
  }
  return entry.builder(parsed, config);
}

/**
 * @param {string} metadataType - any metadata type without a dedicated skill builder
 * @param {object} parsed       - output from parseGeneric: { items: [...] }
 * @param {object} config       - org-config.json contents
 * @returns {string} reference Markdown
 */
function generateReference(metadataType, parsed, config) {
  const { items = [] } = parsed;
  const now = new Date().toISOString().split('T')[0];

  let md = `# Reference: ${metadataType}\n`;
  md += `<!-- Generated by sf-claude-context-forge on ${now} for org: ${config.orgName} -->\n\n`;
  md += `Informational inventory only — not loaded as a Claude skill. ${items.length} item(s) found.\n\n`;

  for (const item of items) {
    md += `### ${item.fullName || item.apiName}\n`;
    if (item.label)       md += `- **Label:** ${item.label}\n`;
    if (item.description) md += `- **Description:** ${item.description}\n`;
    md += '\n';
  }

  return md;
}

// ─── TIER-1 BUILDERS ─────────────────────────────────────────────────────────

function buildObjectsSkill(parsed, config) {
  const { objects = [] } = parsed;
  const prefixes = [...new Set(objects.map(o => o.apiName?.split('__')[0]).filter(Boolean))];

  let skillMd = frontmatter(
    'salesforce-objects',
    'Conventions for creating custom objects and fields in this org. Use when creating or modifying Salesforce custom objects, custom fields, or object metadata.'
  );
  skillMd += `# Custom objects & fields\n\n## Naming conventions\n`;
  if (prefixes.length) skillMd += `- **Namespace/prefix patterns found:** ${prefixes.join(', ')}\n`;
  skillMd += `- Custom objects end with \`__c\`\n- Custom fields end with \`__c\`\n\n`;
  skillMd += `## Design rules for new objects\n`;
  skillMd += `- Mirror the naming prefix patterns listed above\n`;
  skillMd += `- Always include a Description on new objects\n`;
  skillMd += `- Required fields should be clearly marked\n`;
  skillMd += `- Lookup fields should follow the pattern: \`RelatedObject__c\`\n\n`;
  skillMd += `See \`references/objects-reference.md\` for the full inventory of objects and fields in this org.\n`;

  let referenceMd = `# Reference: Custom objects & fields (${objects.length})\n\n`;
  for (const obj of objects) {
    referenceMd += `### ${obj.apiName || obj.label}\n`;
    if (obj.label)       referenceMd += `- **Label:** ${obj.label}\n`;
    if (obj.description) referenceMd += `- **Description:** ${obj.description}\n`;
    if (obj.fields?.length) {
      referenceMd += `- **Field count:** ${obj.fields.length}\n`;
      referenceMd += `- **Field types used:** ${[...new Set(obj.fields.map(f => f.type))].join(', ')}\n`;
      referenceMd += `- **Sample fields:**\n`;
      for (const f of obj.fields.slice(0, 5)) {
        referenceMd += `  - \`${f.apiName}\` (${f.type})${f.required ? ' — required' : ''}\n`;
      }
    }
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildFlowsSkill(parsed, config) {
  const { flows = [] } = parsed;
  const types = [...new Set(flows.map(f => f.processType).filter(Boolean))];
  const names = flows.map(f => f.apiName || '').filter(Boolean);

  let skillMd = frontmatter(
    'salesforce-flows',
    "Conventions for building Flows in this org. Use when creating new Flows, Screen Flows, or Record-Triggered Flows."
  );
  skillMd += `# Flows & automations\n\n## Flow types in use\n`;
  for (const t of types) skillMd += `- ${t}\n`;
  skillMd += `\n## Naming patterns\n`;
  if (names.length) skillMd += `Examples from this org: ${names.slice(0, 8).map(n => `\`${n}\``).join(', ')}\n\n`;
  skillMd += `## Design rules for new flows\n`;
  skillMd += `- Match the naming conventions shown above\n`;
  skillMd += `- Record-triggered flows should specify trigger type (Before Save / After Save)\n`;
  skillMd += `- Always add a description explaining the flow's business purpose\n`;
  skillMd += `- Fault paths should be handled for all DML operations\n\n`;
  skillMd += `See \`references/flows-reference.md\` for the full flow inventory.\n`;

  let referenceMd = `# Reference: Flows & automations (${flows.length})\n\n`;
  for (const flow of flows) {
    referenceMd += `### ${flow.apiName}\n`;
    if (flow.label)       referenceMd += `- **Label:** ${flow.label}\n`;
    if (flow.processType) referenceMd += `- **Type:** ${flow.processType}\n`;
    if (flow.triggerType) referenceMd += `- **Trigger:** ${flow.triggerType}\n`;
    if (flow.object)      referenceMd += `- **Object:** ${flow.object}\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildApexSkill(parsed, config) {
  const { classes = [], triggers = [] } = parsed;
  const names = classes.map(c => c.name).filter(Boolean);

  let skillMd = frontmatter(
    'salesforce-apex',
    'Conventions for writing Apex classes and triggers in this org. Use when writing new Apex classes, trigger handlers, or test classes.'
  );
  skillMd += `# Apex classes & triggers\n\n## Class naming conventions\n`;
  if (names.length) {
    skillMd += `Examples: ${names.slice(0, 8).map(n => `\`${n}\``).join(', ')}\n\n`;
    if (names.some(n => n.includes('Handler'))) skillMd += `- Trigger handlers named: \`{Object}TriggerHandler\`\n`;
    if (names.some(n => n.includes('Service'))) skillMd += `- Service classes named: \`{Domain}Service\`\n`;
    if (names.some(n => n.includes('Helper')))  skillMd += `- Helper classes named: \`{Domain}Helper\`\n`;
    if (names.some(n => n.endsWith('Test') || n.endsWith('_Test'))) skillMd += `- Test classes named: \`{ClassName}Test\`\n`;
  }
  skillMd += `\n## Trigger conventions\n`;
  for (const t of triggers) {
    skillMd += `- \`${t.name}\` → object: ${t.object || 'unknown'}, events: ${t.events?.join(', ') || 'unknown'}\n`;
  }
  skillMd += `\n## Design rules for new Apex\n`;
  skillMd += `- One trigger per object — all logic in a handler class\n`;
  skillMd += `- Bulkify all trigger logic (never query or DML inside loops)\n`;
  skillMd += `- Test classes must have @isTest annotation and achieve 90%+ coverage\n`;
  skillMd += `- Use \`with sharing\` on all new classes unless explicitly required otherwise\n`;
  skillMd += `- Constants go in a dedicated \`Constants\` or \`{Domain}Constants\` class\n\n`;
  skillMd += `See \`references/apex-reference.md\` for the full class/trigger inventory.\n`;

  let referenceMd = `# Reference: Apex classes & triggers (${classes.length} classes, ${triggers.length} triggers)\n\n## Classes\n`;
  for (const cls of classes) referenceMd += `- \`${cls.name}\`${cls.isTest ? ' [test]' : ''}\n`;
  referenceMd += `\n## Triggers\n`;
  for (const t of triggers) referenceMd += `- \`${t.name}\` → object: ${t.object || 'unknown'}, events: ${t.events?.join(', ') || 'unknown'}\n`;

  return { skillMd, referenceMd };
}

function buildLwcSkill(parsed, config) {
  const { components = [] } = parsed;
  const names = components.map(c => c.name).filter(Boolean);

  let skillMd = frontmatter(
    'salesforce-lwc',
    'Conventions for building Lightning Web Components in this org. Use when creating new LWC components.'
  );
  skillMd += `# LWC components\n\n## Component naming conventions\n- camelCase for component folder and files\n`;
  if (names.length) skillMd += `- Examples from this org: ${names.slice(0, 8).map(n => `\`${n}\``).join(', ')}\n`;
  skillMd += `\n## Design rules for new LWC\n`;
  skillMd += `- Every component needs: .js, .html, .js-meta.xml\n`;
  skillMd += `- Use @wire for read operations, imperative Apex for write operations\n`;
  skillMd += `- Fire events upward, properties downward\n`;
  skillMd += `- CSS scoped to component — no global styles\n\n`;
  skillMd += `See \`references/lwc-reference.md\` for the full component inventory.\n`;

  let referenceMd = `# Reference: LWC components (${components.length})\n\n`;
  for (const cmp of components) {
    referenceMd += `### ${cmp.name}\n`;
    if (cmp.files?.length) referenceMd += `- **Files:** ${cmp.files.join(', ')}\n`;
    if (cmp.hasApexWire)   referenceMd += `- **Pattern:** Uses @wire with Apex\n`;
    if (cmp.hasLds)        referenceMd += `- **Pattern:** Uses Lightning Data Service\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildPermsetSkill(parsed, config) {
  const { permsets = [] } = parsed;

  let skillMd = frontmatter(
    'salesforce-permission-sets',
    "Conventions for this org's access model. Use when creating new permission sets."
  );
  skillMd += `# Permission sets\n\n## Design rules for new permission sets\n`;
  skillMd += `- Always add a clear description explaining the business role\n`;
  skillMd += `- Grant minimum required access — never grant Delete unless justified\n`;
  skillMd += `- Field-level security must be explicitly set for sensitive fields\n\n`;
  skillMd += `See \`references/permission-sets-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Permission sets (${permsets.length})\n\n`;
  for (const ps of permsets) {
    referenceMd += `### ${ps.label || ps.apiName}\n`;
    if (ps.description)         referenceMd += `- **Description:** ${ps.description}\n`;
    if (ps.objectPerms?.length) referenceMd += `- **Object permissions:** ${ps.objectPerms.length} objects\n`;
    if (ps.fieldPerms?.length)  referenceMd += `- **Field permissions:** ${ps.fieldPerms.length} fields\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildProfileSkill(parsed, config) {
  const { profiles = [] } = parsed;

  let skillMd = frontmatter(
    'salesforce-profiles',
    "This org's user access model. Use when modifying profiles or reasoning about baseline user access."
  );
  skillMd += `# Profiles\n\n## Design rules\n`;
  skillMd += `- Prefer permission sets over profile permissions for feature access\n`;
  skillMd += `- Profiles define baseline access; permission sets layer on top\n\n`;
  skillMd += `See \`references/profiles-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Profiles (${profiles.length})\n\n`;
  for (const p of profiles) referenceMd += `- \`${p.name}\`\n`;

  return { skillMd, referenceMd };
}

function buildLayoutSkill(parsed, config) {
  const { layouts = [] } = parsed;

  let skillMd = frontmatter(
    'salesforce-layouts',
    'Conventions for page layouts in this org. Use when creating or modifying page layouts.'
  );
  skillMd += `# Page layouts\n\n## Design rules\n`;
  skillMd += `- Group related fields into sections\n`;
  skillMd += `- Required fields should appear in the first section\n`;
  skillMd += `- Use 2-column layout for standard sections\n\n`;
  skillMd += `See \`references/layouts-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Page layouts (${layouts.length})\n\n`;
  for (const l of layouts) referenceMd += `- \`${l.name}\`\n`;

  return { skillMd, referenceMd };
}

function buildTemplateSkill(parsed, config) {
  const { templates = [] } = parsed;

  let skillMd = frontmatter(
    'salesforce-email-templates',
    "Conventions for this org's email templates. Use when creating new email templates."
  );
  skillMd += `# Email templates\n\n## Design rules for new templates\n`;
  skillMd += `- Use merge fields for personalization\n`;
  skillMd += `- Always include a plain-text version\n`;
  skillMd += `- Subject lines should be clear and action-oriented\n\n`;
  skillMd += `See \`references/email-templates-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Email templates (${templates.length})\n\n`;
  for (const t of templates) {
    referenceMd += `### ${t.name}\n`;
    if (t.subject)  referenceMd += `- **Subject pattern:** ${t.subject}\n`;
    if (t.encoding) referenceMd += `- **Encoding:** ${t.encoding}\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildCustomMetadataSkill(parsed, config) {
  const { records = [] } = parsed;
  const typeNames = [...new Set(records.map(r => r.typeName).filter(Boolean))];

  let skillMd = frontmatter(
    'salesforce-custom-metadata',
    "Conventions for this org's Custom Metadata Types. Use when creating new custom metadata type records."
  );
  skillMd += `# Custom Metadata\n\n## Custom Metadata Types in use\n`;
  for (const t of typeNames) skillMd += `- \`${t}\`\n`;
  skillMd += `\n## Design rules for new records\n`;
  skillMd += `- Record names should describe the configuration they hold, not the type\n`;
  skillMd += `- Mark records \`protected\` only when they should not be visible to subscriber orgs\n`;
  skillMd += `- Prefer Custom Metadata over Custom Settings for new configuration — it's deployable and queryable\n\n`;
  skillMd += `See \`references/custom-metadata-reference.md\` for the full record inventory.\n`;

  let referenceMd = `# Reference: Custom Metadata records (${records.length})\n\n`;
  for (const r of records) {
    referenceMd += `### ${r.fullName}\n`;
    if (r.label) referenceMd += `- **Label:** ${r.label}\n`;
    referenceMd += `- **Type:** ${r.typeName}\n- **Protected:** ${r.protected}\n`;
    if (r.fields?.length) {
      referenceMd += `- **Fields:**\n`;
      for (const f of r.fields) referenceMd += `  - \`${f.field}\` = ${f.value}\n`;
    }
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildConnectedAppSkill(parsed, config) {
  const { apps = [] } = parsed;
  const allScopes = [...new Set(apps.flatMap(a => a.scopes || []))];

  let skillMd = frontmatter(
    'salesforce-connected-apps',
    "Conventions for this org's Connected Apps. Use when creating a new Connected App for an integration."
  );
  skillMd += `# Connected Apps\n\n## OAuth scopes commonly used in this org\n`;
  for (const s of allScopes) skillMd += `- ${s}\n`;
  skillMd += `\n## Design rules for new connected apps\n`;
  skillMd += `- Request the minimum OAuth scopes needed for the integration\n`;
  skillMd += `- Always set a contact email for ownership traceability\n`;
  skillMd += `- Prefer named credentials / external client apps over storing secrets in Apex\n\n`;
  skillMd += `See \`references/connected-apps-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Connected Apps (${apps.length})\n\n`;
  for (const a of apps) {
    referenceMd += `### ${a.label || a.apiName}\n`;
    if (a.description)    referenceMd += `- **Description:** ${a.description}\n`;
    if (a.contactEmail)   referenceMd += `- **Contact email:** ${a.contactEmail}\n`;
    if (a.scopes?.length)  referenceMd += `- **Scopes:** ${a.scopes.join(', ')}\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildPromptTemplateSkill(parsed, config) {
  const { templates = [] } = parsed;
  const templateTypes = [...new Set(templates.map(t => t.templateType).filter(Boolean))];

  let skillMd = frontmatter(
    'salesforce-prompt-templates',
    "Conventions for this org's Prompt Builder / GenAI prompt templates. Use when creating a new Agentforce or Prompt Builder template."
  );
  skillMd += `# Prompt templates (Prompt Builder / Agentforce)\n\n## Template types in use\n`;
  for (const t of templateTypes) skillMd += `- ${t}\n`;
  skillMd += `\n## Design rules for new prompt templates\n`;
  skillMd += `- Keep grounding/merge-field references explicit and scoped to the fields actually needed\n`;
  skillMd += `- Give every template a description explaining its business purpose\n`;
  skillMd += `- Test each template version before activating it\n\n`;
  skillMd += `See \`references/prompt-templates-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Prompt templates (${templates.length})\n\n`;
  for (const t of templates) {
    referenceMd += `### ${t.masterLabel || t.apiName}\n`;
    if (t.templateType) referenceMd += `- **Type:** ${t.templateType}\n`;
    if (t.description)  referenceMd += `- **Description:** ${t.description}\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildFlexipageSkill(parsed, config) {
  const { pages = [] } = parsed;
  const pageTypes = [...new Set(pages.map(p => p.type).filter(Boolean))];

  let skillMd = frontmatter(
    'salesforce-flexipages',
    "Conventions for this org's Lightning pages (FlexiPages). Use when creating a new App Page, Record Page, or Home Page."
  );
  skillMd += `# FlexiPages (Lightning App Builder)\n\n## Page types in use\n`;
  for (const t of pageTypes) skillMd += `- ${t}\n`;
  skillMd += `\n## Design rules for new pages\n`;
  skillMd += `- Name pages by their purpose and object, e.g. \`{Object}_Record_Page\`\n`;
  skillMd += `- Record pages should declare the \`sobjectType\` they target\n`;
  skillMd += `- Reuse existing components before building new custom ones\n\n`;
  skillMd += `See \`references/flexipages-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: FlexiPages (${pages.length})\n\n`;
  for (const p of pages) {
    referenceMd += `### ${p.masterLabel || p.apiName}\n`;
    if (p.type)        referenceMd += `- **Type:** ${p.type}\n`;
    if (p.sobjectType) referenceMd += `- **Object:** ${p.sobjectType}\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

function buildApprovalProcessSkill(parsed, config) {
  const { processes = [] } = parsed;
  const entities = [...new Set(processes.map(p => p.entity).filter(Boolean))];

  let skillMd = frontmatter(
    'salesforce-approval-processes',
    "Conventions for this org's Approval Processes. Use when creating a new approval process."
  );
  skillMd += `# Approval Processes\n\n## Objects with approval processes\n`;
  for (const e of entities) skillMd += `- ${e}\n`;
  skillMd += `\n## Design rules for new approval processes\n`;
  skillMd += `- Give every process a description explaining when it triggers and why\n`;
  skillMd += `- Define an explicit rejection/recall path, not just the approval path\n`;
  skillMd += `- Keep entry criteria narrow enough to avoid unintended submissions\n\n`;
  skillMd += `See \`references/approval-processes-reference.md\` for the full inventory.\n`;

  let referenceMd = `# Reference: Approval Processes (${processes.length})\n\n`;
  for (const p of processes) {
    referenceMd += `### ${p.fullName}\n`;
    if (p.label) referenceMd += `- **Label:** ${p.label}\n`;
    referenceMd += `- **Object:** ${p.entity}\n- **Active:** ${p.active}\n`;
    if (p.description) referenceMd += `- **Description:** ${p.description}\n`;
    referenceMd += '\n';
  }

  return { skillMd, referenceMd };
}

module.exports = { generateSkill, generateReference, isSkillType, skillNameFor };
```

- [ ] **Step 2: Replace `scripts/python/generator.py` in full**

```python
"""
generator.py
Converts parsed metadata into Claude Agent Skills (SKILL.md + references/)
for creatable metadata types, or plain reference Markdown for everything else.
Port of scripts/node/generator.js.
"""

from datetime import date


def _frontmatter(name: str, description: str) -> str:
    return f'---\nname: {name}\ndescription: {description}\n---\n\n'


def is_skill_type(metadata_type: str) -> bool:
    """True if metadata_type has a dedicated Tier-1 skill builder."""
    return metadata_type in _SKILL_REGISTRY


def skill_name_for(metadata_type: str) -> str | None:
    """The .claude/skills/<name> directory name for a Tier-1 metadata type."""
    entry = _SKILL_REGISTRY.get(metadata_type)
    return entry['skillName'] if entry else None


def generate_skill(metadata_type: str, parsed: dict, config: dict) -> dict:
    """
    Generate a Tier-1 skill (SKILL.md + reference Markdown) for a creatable type.

    Returns:
        {'skillMd': str, 'referenceMd': str}
    """
    entry = _SKILL_REGISTRY.get(metadata_type)
    if not entry:
        raise ValueError(f'No skill builder registered for metadata type: {metadata_type}')
    return entry['builder'](parsed, config)


def generate_reference(metadata_type: str, parsed: dict, config: dict) -> str:
    """Generate a Tier-2 plain-reference Markdown doc for a non-creatable metadata type."""
    items = parsed.get('items', [])
    now = date.today().isoformat()
    org_name = config.get('orgName', 'unknown')

    lines = [
        f'# Reference: {metadata_type}',
        f'<!-- Generated by sf-claude-context-forge on {now} for org: {org_name} -->',
        '',
        f'Informational inventory only — not loaded as a Claude skill. {len(items)} item(s) found.',
        '',
    ]

    for item in items:
        lines.append(f"### {item.get('fullName') or item.get('apiName', '')}")
        if item.get('label'):
            lines.append(f"- **Label:** {item['label']}")
        if item.get('description'):
            lines.append(f"- **Description:** {item['description']}")
        lines.append('')

    return '\n'.join(lines) + '\n'


# ─── TIER-1 BUILDERS ─────────────────────────────────────────────────────────

def _build_objects_skill(parsed: dict, config: dict) -> dict:
    objects = parsed.get('objects', [])
    prefixes = list(dict.fromkeys(
        o['apiName'].split('__')[0] for o in objects if o.get('apiName') and '__' in o['apiName']
    ))

    skill_lines = [_frontmatter(
        'salesforce-objects',
        'Conventions for creating custom objects and fields in this org. Use when creating or '
        'modifying Salesforce custom objects, custom fields, or object metadata.'
    ).rstrip('\n'), '', '# Custom objects & fields', '', '## Naming conventions']
    if prefixes:
        skill_lines.append(f"- **Namespace/prefix patterns found:** {', '.join(prefixes)}")
    skill_lines += [
        '- Custom objects end with `__c`',
        '- Custom fields end with `__c`',
        '',
        '## Design rules for new objects',
        '- Mirror the naming prefix patterns listed above',
        '- Always include a Description on new objects',
        '- Required fields should be clearly marked',
        '- Lookup fields should follow the pattern: `RelatedObject__c`',
        '',
        'See `references/objects-reference.md` for the full inventory of objects and fields in this org.',
    ]

    ref_lines = [f'# Reference: Custom objects & fields ({len(objects)})', '']
    for obj in objects:
        ref_lines.append(f"### {obj.get('apiName') or obj.get('label', '')}")
        if obj.get('label'):
            ref_lines.append(f"- **Label:** {obj['label']}")
        if obj.get('description'):
            ref_lines.append(f"- **Description:** {obj['description']}")
        fields = obj.get('fields', [])
        if fields:
            field_types = list(dict.fromkeys(f['type'] for f in fields if f.get('type')))
            ref_lines.append(f"- **Field count:** {len(fields)}")
            ref_lines.append(f"- **Field types used:** {', '.join(field_types)}")
            ref_lines.append('- **Sample fields:**')
            for f in fields[:5]:
                req = ' — required' if f.get('required') else ''
                ref_lines.append(f"  - `{f['apiName']}` ({f.get('type', '')}){req}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_flows_skill(parsed: dict, config: dict) -> dict:
    flows = parsed.get('flows', [])
    types = list(dict.fromkeys(f['processType'] for f in flows if f.get('processType')))
    names = [f['apiName'] for f in flows if f.get('apiName')]

    skill_lines = [_frontmatter(
        'salesforce-flows',
        'Conventions for building Flows in this org. Use when creating new Flows, Screen Flows, or Record-Triggered Flows.'
    ).rstrip('\n'), '', '# Flows & automations', '', '## Flow types in use']
    skill_lines += [f'- {t}' for t in types]
    skill_lines += ['', '## Naming patterns']
    if names:
        skill_lines.append(f"Examples from this org: {', '.join(f'`{n}`' for n in names[:8])}")
    skill_lines += [
        '',
        '## Design rules for new flows',
        '- Match the naming conventions shown above',
        '- Record-triggered flows should specify trigger type (Before Save / After Save)',
        "- Always add a description explaining the flow's business purpose",
        '- Fault paths should be handled for all DML operations',
        '',
        'See `references/flows-reference.md` for the full flow inventory.',
    ]

    ref_lines = [f'# Reference: Flows & automations ({len(flows)})', '']
    for flow in flows:
        ref_lines.append(f"### {flow.get('apiName', '')}")
        if flow.get('label'):
            ref_lines.append(f"- **Label:** {flow['label']}")
        if flow.get('processType'):
            ref_lines.append(f"- **Type:** {flow['processType']}")
        if flow.get('triggerType'):
            ref_lines.append(f"- **Trigger:** {flow['triggerType']}")
        if flow.get('object'):
            ref_lines.append(f"- **Object:** {flow['object']}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_apex_skill(parsed: dict, config: dict) -> dict:
    classes = parsed.get('classes', [])
    triggers = parsed.get('triggers', [])
    names = [c['name'] for c in classes if c.get('name')]

    skill_lines = [_frontmatter(
        'salesforce-apex',
        'Conventions for writing Apex classes and triggers in this org. Use when writing new Apex classes, trigger handlers, or test classes.'
    ).rstrip('\n'), '', '# Apex classes & triggers', '', '## Class naming conventions']
    if names:
        skill_lines.append(f"Examples: {', '.join(f'`{n}`' for n in names[:8])}")
        skill_lines.append('')
        if any('Handler' in n for n in names):
            skill_lines.append('- Trigger handlers named: `{Object}TriggerHandler`')
        if any('Service' in n for n in names):
            skill_lines.append('- Service classes named: `{Domain}Service`')
        if any('Helper' in n for n in names):
            skill_lines.append('- Helper classes named: `{Domain}Helper`')
        if any(n.endswith('Test') or n.endswith('_Test') for n in names):
            skill_lines.append('- Test classes named: `{ClassName}Test`')
    skill_lines += ['', '## Trigger conventions']
    for t in triggers:
        events = ', '.join(t.get('events', [])) or 'unknown'
        skill_lines.append(f"- `{t['name']}` → object: {t.get('object') or 'unknown'}, events: {events}")
    skill_lines += [
        '',
        '## Design rules for new Apex',
        '- One trigger per object — all logic in a handler class',
        '- Bulkify all trigger logic (never query or DML inside loops)',
        '- Test classes must have @isTest annotation and achieve 90%+ coverage',
        '- Use `with sharing` on all new classes unless explicitly required otherwise',
        '- Constants go in a dedicated `Constants` or `{Domain}Constants` class',
        '',
        'See `references/apex-reference.md` for the full class/trigger inventory.',
    ]

    ref_lines = [f'# Reference: Apex classes & triggers ({len(classes)} classes, {len(triggers)} triggers)', '', '## Classes']
    for cls in classes:
        test_tag = ' [test]' if cls.get('isTest') else ''
        ref_lines.append(f"- `{cls['name']}`{test_tag}")
    ref_lines += ['', '## Triggers']
    for t in triggers:
        events = ', '.join(t.get('events', [])) or 'unknown'
        ref_lines.append(f"- `{t['name']}` → object: {t.get('object') or 'unknown'}, events: {events}")

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_lwc_skill(parsed: dict, config: dict) -> dict:
    components = parsed.get('components', [])
    names = [c['name'] for c in components if c.get('name')]

    skill_lines = [_frontmatter(
        'salesforce-lwc',
        'Conventions for building Lightning Web Components in this org. Use when creating new LWC components.'
    ).rstrip('\n'), '', '# LWC components', '', '## Component naming conventions', '- camelCase for component folder and files']
    if names:
        skill_lines.append(f"- Examples from this org: {', '.join(f'`{n}`' for n in names[:8])}")
    skill_lines += [
        '',
        '## Design rules for new LWC',
        '- Every component needs: .js, .html, .js-meta.xml',
        '- Use @wire for read operations, imperative Apex for write operations',
        '- Fire events upward, properties downward',
        '- CSS scoped to component — no global styles',
        '',
        'See `references/lwc-reference.md` for the full component inventory.',
    ]

    ref_lines = [f'# Reference: LWC components ({len(components)})', '']
    for cmp in components:
        ref_lines.append(f"### {cmp['name']}")
        if cmp.get('files'):
            ref_lines.append(f"- **Files:** {', '.join(cmp['files'])}")
        if cmp.get('hasApexWire'):
            ref_lines.append('- **Pattern:** Uses @wire with Apex')
        if cmp.get('hasLds'):
            ref_lines.append('- **Pattern:** Uses Lightning Data Service')
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_permset_skill(parsed: dict, config: dict) -> dict:
    permsets = parsed.get('permsets', [])

    skill_lines = [_frontmatter(
        'salesforce-permission-sets',
        "Conventions for this org's access model. Use when creating new permission sets."
    ).rstrip('\n'), '', '# Permission sets', '', '## Design rules for new permission sets',
        '- Always add a clear description explaining the business role',
        '- Grant minimum required access — never grant Delete unless justified',
        '- Field-level security must be explicitly set for sensitive fields',
        '',
        'See `references/permission-sets-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Permission sets ({len(permsets)})', '']
    for ps in permsets:
        ref_lines.append(f"### {ps.get('label') or ps.get('apiName', '')}")
        if ps.get('description'):
            ref_lines.append(f"- **Description:** {ps['description']}")
        if ps.get('objectPerms'):
            ref_lines.append(f"- **Object permissions:** {len(ps['objectPerms'])} objects")
        if ps.get('fieldPerms'):
            ref_lines.append(f"- **Field permissions:** {len(ps['fieldPerms'])} fields")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_profile_skill(parsed: dict, config: dict) -> dict:
    profiles = parsed.get('profiles', [])

    skill_lines = [_frontmatter(
        'salesforce-profiles',
        "This org's user access model. Use when modifying profiles or reasoning about baseline user access."
    ).rstrip('\n'), '', '# Profiles', '', '## Design rules',
        '- Prefer permission sets over profile permissions for feature access',
        '- Profiles define baseline access; permission sets layer on top',
        '',
        'See `references/profiles-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Profiles ({len(profiles)})']
    for p in profiles:
        ref_lines.append(f"- `{p['name']}`")

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_layout_skill(parsed: dict, config: dict) -> dict:
    layouts = parsed.get('layouts', [])

    skill_lines = [_frontmatter(
        'salesforce-layouts',
        'Conventions for page layouts in this org. Use when creating or modifying page layouts.'
    ).rstrip('\n'), '', '# Page layouts', '', '## Design rules',
        '- Group related fields into sections',
        '- Required fields should appear in the first section',
        '- Use 2-column layout for standard sections',
        '',
        'See `references/layouts-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Page layouts ({len(layouts)})']
    for l in layouts:
        ref_lines.append(f"- `{l['name']}`")

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_template_skill(parsed: dict, config: dict) -> dict:
    templates = parsed.get('templates', [])

    skill_lines = [_frontmatter(
        'salesforce-email-templates',
        "Conventions for this org's email templates. Use when creating new email templates."
    ).rstrip('\n'), '', '# Email templates', '', '## Design rules for new templates',
        '- Use merge fields for personalization',
        '- Always include a plain-text version',
        '- Subject lines should be clear and action-oriented',
        '',
        'See `references/email-templates-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Email templates ({len(templates)})', '']
    for t in templates:
        ref_lines.append(f"### {t['name']}")
        if t.get('subject'):
            ref_lines.append(f"- **Subject pattern:** {t['subject']}")
        if t.get('encoding'):
            ref_lines.append(f"- **Encoding:** {t['encoding']}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_custom_metadata_skill(parsed: dict, config: dict) -> dict:
    records = parsed.get('records', [])
    type_names = list(dict.fromkeys(r['typeName'] for r in records if r.get('typeName')))

    skill_lines = [_frontmatter(
        'salesforce-custom-metadata',
        "Conventions for this org's Custom Metadata Types. Use when creating new custom metadata type records."
    ).rstrip('\n'), '', '# Custom Metadata', '', '## Custom Metadata Types in use']
    skill_lines += [f'- `{t}`' for t in type_names]
    skill_lines += [
        '',
        '## Design rules for new records',
        '- Record names should describe the configuration they hold, not the type',
        '- Mark records `protected` only when they should not be visible to subscriber orgs',
        "- Prefer Custom Metadata over Custom Settings for new configuration — it's deployable and queryable",
        '',
        'See `references/custom-metadata-reference.md` for the full record inventory.',
    ]

    ref_lines = [f'# Reference: Custom Metadata records ({len(records)})', '']
    for r in records:
        ref_lines.append(f"### {r['fullName']}")
        if r.get('label'):
            ref_lines.append(f"- **Label:** {r['label']}")
        ref_lines.append(f"- **Type:** {r['typeName']}")
        ref_lines.append(f"- **Protected:** {r['protected']}")
        if r.get('fields'):
            ref_lines.append('- **Fields:**')
            for f in r['fields']:
                ref_lines.append(f"  - `{f['field']}` = {f['value']}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_connected_app_skill(parsed: dict, config: dict) -> dict:
    apps = parsed.get('apps', [])
    all_scopes = list(dict.fromkeys(s for a in apps for s in a.get('scopes', [])))

    skill_lines = [_frontmatter(
        'salesforce-connected-apps',
        "Conventions for this org's Connected Apps. Use when creating a new Connected App for an integration."
    ).rstrip('\n'), '', '# Connected Apps', '', '## OAuth scopes commonly used in this org']
    skill_lines += [f'- {s}' for s in all_scopes]
    skill_lines += [
        '',
        '## Design rules for new connected apps',
        '- Request the minimum OAuth scopes needed for the integration',
        '- Always set a contact email for ownership traceability',
        '- Prefer named credentials / external client apps over storing secrets in Apex',
        '',
        'See `references/connected-apps-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Connected Apps ({len(apps)})', '']
    for a in apps:
        ref_lines.append(f"### {a.get('label') or a.get('apiName', '')}")
        if a.get('description'):
            ref_lines.append(f"- **Description:** {a['description']}")
        if a.get('contactEmail'):
            ref_lines.append(f"- **Contact email:** {a['contactEmail']}")
        if a.get('scopes'):
            ref_lines.append(f"- **Scopes:** {', '.join(a['scopes'])}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_prompt_template_skill(parsed: dict, config: dict) -> dict:
    templates = parsed.get('templates', [])
    template_types = list(dict.fromkeys(t['templateType'] for t in templates if t.get('templateType')))

    skill_lines = [_frontmatter(
        'salesforce-prompt-templates',
        "Conventions for this org's Prompt Builder / GenAI prompt templates. Use when creating a new Agentforce or Prompt Builder template."
    ).rstrip('\n'), '', '# Prompt templates (Prompt Builder / Agentforce)', '', '## Template types in use']
    skill_lines += [f'- {t}' for t in template_types]
    skill_lines += [
        '',
        '## Design rules for new prompt templates',
        '- Keep grounding/merge-field references explicit and scoped to the fields actually needed',
        '- Give every template a description explaining its business purpose',
        '- Test each template version before activating it',
        '',
        'See `references/prompt-templates-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Prompt templates ({len(templates)})', '']
    for t in templates:
        ref_lines.append(f"### {t.get('masterLabel') or t.get('apiName', '')}")
        if t.get('templateType'):
            ref_lines.append(f"- **Type:** {t['templateType']}")
        if t.get('description'):
            ref_lines.append(f"- **Description:** {t['description']}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_flexipage_skill(parsed: dict, config: dict) -> dict:
    pages = parsed.get('pages', [])
    page_types = list(dict.fromkeys(p['type'] for p in pages if p.get('type')))

    skill_lines = [_frontmatter(
        'salesforce-flexipages',
        "Conventions for this org's Lightning pages (FlexiPages). Use when creating a new App Page, Record Page, or Home Page."
    ).rstrip('\n'), '', '# FlexiPages (Lightning App Builder)', '', '## Page types in use']
    skill_lines += [f'- {t}' for t in page_types]
    skill_lines += [
        '',
        '## Design rules for new pages',
        '- Name pages by their purpose and object, e.g. `{Object}_Record_Page`',
        '- Record pages should declare the `sobjectType` they target',
        '- Reuse existing components before building new custom ones',
        '',
        'See `references/flexipages-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: FlexiPages ({len(pages)})', '']
    for p in pages:
        ref_lines.append(f"### {p.get('masterLabel') or p.get('apiName', '')}")
        if p.get('type'):
            ref_lines.append(f"- **Type:** {p['type']}")
        if p.get('sobjectType'):
            ref_lines.append(f"- **Object:** {p['sobjectType']}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


def _build_approval_process_skill(parsed: dict, config: dict) -> dict:
    processes = parsed.get('processes', [])
    entities = list(dict.fromkeys(p['entity'] for p in processes if p.get('entity')))

    skill_lines = [_frontmatter(
        'salesforce-approval-processes',
        "Conventions for this org's Approval Processes. Use when creating a new approval process."
    ).rstrip('\n'), '', '# Approval Processes', '', '## Objects with approval processes']
    skill_lines += [f'- {e}' for e in entities]
    skill_lines += [
        '',
        '## Design rules for new approval processes',
        '- Give every process a description explaining when it triggers and why',
        '- Define an explicit rejection/recall path, not just the approval path',
        '- Keep entry criteria narrow enough to avoid unintended submissions',
        '',
        'See `references/approval-processes-reference.md` for the full inventory.',
    ]

    ref_lines = [f'# Reference: Approval Processes ({len(processes)})', '']
    for p in processes:
        ref_lines.append(f"### {p['fullName']}")
        if p.get('label'):
            ref_lines.append(f"- **Label:** {p['label']}")
        ref_lines.append(f"- **Object:** {p['entity']}")
        ref_lines.append(f"- **Active:** {p['active']}")
        if p.get('description'):
            ref_lines.append(f"- **Description:** {p['description']}")
        ref_lines.append('')

    return {'skillMd': '\n'.join(skill_lines) + '\n', 'referenceMd': '\n'.join(ref_lines) + '\n'}


_SKILL_REGISTRY = {
    'objects':              {'skillName': 'salesforce-objects',            'builder': _build_objects_skill},
    'flows':                {'skillName': 'salesforce-flows',              'builder': _build_flows_skill},
    'classes':              {'skillName': 'salesforce-apex',               'builder': _build_apex_skill},
    'triggers':             {'skillName': 'salesforce-apex',               'builder': _build_apex_skill},
    'lwc':                  {'skillName': 'salesforce-lwc',                'builder': _build_lwc_skill},
    'permissionsets':       {'skillName': 'salesforce-permission-sets',    'builder': _build_permset_skill},
    'profiles':              {'skillName': 'salesforce-profiles',           'builder': _build_profile_skill},
    'layouts':               {'skillName': 'salesforce-layouts',            'builder': _build_layout_skill},
    'emailTemplates':        {'skillName': 'salesforce-email-templates',    'builder': _build_template_skill},
    'customMetadata':        {'skillName': 'salesforce-custom-metadata',    'builder': _build_custom_metadata_skill},
    'connectedApps':         {'skillName': 'salesforce-connected-apps',     'builder': _build_connected_app_skill},
    'genAiPromptTemplates':  {'skillName': 'salesforce-prompt-templates',   'builder': _build_prompt_template_skill},
    'flexipages':            {'skillName': 'salesforce-flexipages',         'builder': _build_flexipage_skill},
    'approvalProcesses':     {'skillName': 'salesforce-approval-processes', 'builder': _build_approval_process_skill},
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/node/generator.js scripts/python/generator.py
git commit -m "Rewrite generator as two-tier: SKILL.md+references for creatable types, plain reference Markdown otherwise"
```

---

### Task 5: Rewrite orchestration — forge.js and forge.py

**Files:**
- Modify: `forge.js` (full rewrite)
- Modify: `forge.py` (full rewrite)

**Behavior:** Dedicated (Tier-1) types write `.claude/skills/<skillName>/SKILL.md` + `.claude/skills/<skillName>/references/<type>-reference.md`. Any other subdirectory found under `srcDir` that isn't already a dedicated type is parsed with the generic parser and written to `generated/reference/<type>.md` (Tier-2), with no config entry required.

- [ ] **Step 1: Replace `forge.js` in full**

```js
#!/usr/bin/env node
/**
 * sf-claude-context-forge — Node.js entry point
 * Orchestrates parsing of SF metadata and generation of Claude Agent Skills.
 */

const fs = require('fs');
const path = require('path');
const { parseObjects }              = require('./scripts/node/parsers/objectParser');
const { parseFlows }                = require('./scripts/node/parsers/flowParser');
const { parseApex }                 = require('./scripts/node/parsers/apexParser');
const { parseLwc }                  = require('./scripts/node/parsers/lwcParser');
const { parsePermsets }             = require('./scripts/node/parsers/permsetParser');
const { parseProfiles }             = require('./scripts/node/parsers/profileParser');
const { parseLayouts }              = require('./scripts/node/parsers/layoutParser');
const { parseTemplates }            = require('./scripts/node/parsers/templateParser');
const { parseCustomMetadata }       = require('./scripts/node/parsers/customMetadataParser');
const { parseConnectedApps }        = require('./scripts/node/parsers/connectedAppParser');
const { parseGenAiPromptTemplates } = require('./scripts/node/parsers/genAiPromptTemplateParser');
const { parseFlexipages }           = require('./scripts/node/parsers/flexipageParser');
const { parseApprovalProcesses }    = require('./scripts/node/parsers/approvalProcessParser');
const { parseGeneric }              = require('./scripts/node/parsers/genericParser');
const { generateSkill, generateReference, isSkillType, skillNameFor } = require('./scripts/node/generator');

const args    = process.argv.slice(2);
const isDry   = args.includes('--dry-run');
const useDemo = args.includes('--demo');

const config  = JSON.parse(fs.readFileSync('./org-config.json', 'utf8'));

const srcDir = resolveSourceDir(config, useDemo);
console.log(`\n📂 Source: ${srcDir}`);
console.log(`📁 Skills: .claude/skills/  |  Reference: ${config.outputDir}/reference\n`);

const PARSERS = {
  objects:              { parser: parseObjects,              label: 'Custom objects & fields' },
  flows:                { parser: parseFlows,                label: 'Flows & automations' },
  classes:              { parser: parseApex,                 label: 'Apex classes' },
  triggers:             { parser: parseApex,                 label: 'Apex triggers' },
  lwc:                  { parser: parseLwc,                  label: 'LWC components' },
  permissionsets:       { parser: parsePermsets,              label: 'Permission sets' },
  profiles:             { parser: parseProfiles,              label: 'Profiles' },
  layouts:              { parser: parseLayouts,               label: 'Page layouts' },
  emailTemplates:       { parser: parseTemplates,             label: 'Email templates' },
  customMetadata:       { parser: parseCustomMetadata,        label: 'Custom Metadata' },
  connectedApps:        { parser: parseConnectedApps,         label: 'Connected Apps' },
  genAiPromptTemplates: { parser: parseGenAiPromptTemplates,  label: 'Prompt templates' },
  flexipages:           { parser: parseFlexipages,            label: 'FlexiPages' },
  approvalProcesses:    { parser: parseApprovalProcesses,     label: 'Approval Processes' },
};

async function run() {
  let skillCount = 0;
  let referenceCount = 0;
  const handled = new Set();
  // Some metadata types share one skill (classes + triggers -> salesforce-apex).
  // Parse everything first and merge array fields per skill before writing once,
  // so the second type parsed never silently overwrites the first's SKILL.md.
  const skillGroups = new Map(); // skillName -> { representativeType, parsed }

  for (const type of config.metadataTypes) {
    const entry = PARSERS[type];
    if (!entry) continue;
    handled.add(type);

    const typeDir = path.join(srcDir, type);
    if (!fs.existsSync(typeDir)) {
      console.log(`⚠  Skipping ${type} — folder not found in ${srcDir}`);
      continue;
    }

    console.log(`⚙  Parsing ${entry.label}...`);
    try {
      const parsed = await entry.parser(typeDir);

      if (isSkillType(type)) {
        const skillName = skillNameFor(type);
        if (!skillGroups.has(skillName)) {
          skillGroups.set(skillName, { representativeType: type, parsed: {} });
        }
        const group = skillGroups.get(skillName);
        for (const [key, value] of Object.entries(parsed)) {
          if (!Array.isArray(value)) continue;
          group.parsed[key] = [...(group.parsed[key] || []), ...value];
        }
      }
    } catch (err) {
      console.error(`   ✗ Error parsing ${type}: ${err.message}`);
    }
  }

  for (const [skillName, group] of skillGroups) {
    const { skillMd, referenceMd } = generateSkill(group.representativeType, group.parsed, config);
    const skillDir = path.join('.claude', 'skills', skillName);
    const refSlug  = skillName.replace(/^salesforce-/, '');
    const refPath  = path.join(skillDir, 'references', `${refSlug}-reference.md`);

    if (!isDry) {
      fs.mkdirSync(skillDir, { recursive: true });
      fs.mkdirSync(path.dirname(refPath), { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
      fs.writeFileSync(refPath, referenceMd, 'utf8');
      console.log(`   ✓ ${path.join(skillDir, 'SKILL.md')}`);
      skillCount++;
    } else {
      console.log(`   [dry-run] would write → ${skillDir}/SKILL.md`);
    }
  }

  // Auto-detect any remaining src/ subdirectories not covered by a dedicated parser.
  if (fs.existsSync(srcDir)) {
    const subdirs = fs.readdirSync(srcDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !handled.has(e.name));

    for (const dirEntry of subdirs) {
      const type    = dirEntry.name;
      const typeDir = path.join(srcDir, type);

      console.log(`⚙  Parsing ${type} (generic)...`);
      try {
        const parsed = await parseGeneric(typeDir);
        if (parsed.items.length === 0) continue;

        const referenceMd = generateReference(type, parsed, config);
        const outPath = path.join(config.outputDir, 'reference', `${kebab(type)}.md`);

        if (!isDry) {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, referenceMd, 'utf8');
          console.log(`   ✓ ${outPath}`);
          referenceCount++;
        } else {
          console.log(`   [dry-run] would write → ${outPath}`);
        }
      } catch (err) {
        console.error(`   ✗ Error parsing ${type}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Done — ${skillCount} skill(s), ${referenceCount} reference doc(s) generated.\n`);
}

function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function resolveSourceDir(config, forceDemo) {
  const src  = path.resolve(config.srcDir);
  const demo = path.resolve(config.demoDir || 'demo-metadata');

  if (forceDemo) return demo;

  if (!fs.existsSync(src)) return demo;
  const entries = fs.readdirSync(src).filter(f => !f.startsWith('.'));
  if (entries.length === 0 && config.useDemoIfSrcEmpty) return demo;

  return src;
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Replace `forge.py` in full**

```python
#!/usr/bin/env python3
"""
sf-claude-context-forge — Python entry point
Orchestrates parsing of SF metadata and generation of Claude Agent Skills.
"""

import re
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts" / "python"))

from parsers.object_parser                import parse_objects
from parsers.flow_parser                  import parse_flows
from parsers.apex_parser                  import parse_apex
from parsers.lwc_parser                   import parse_lwc
from parsers.permset_parser               import parse_permsets
from parsers.profile_parser               import parse_profiles
from parsers.layout_parser                import parse_layouts
from parsers.template_parser              import parse_templates
from parsers.custom_metadata_parser       import parse_custom_metadata
from parsers.connected_app_parser         import parse_connected_apps
from parsers.gen_ai_prompt_template_parser import parse_gen_ai_prompt_templates
from parsers.flexipage_parser             import parse_flexipages
from parsers.approval_process_parser      import parse_approval_processes
from parsers.generic_parser               import parse_generic
from generator import generate_skill, generate_reference, is_skill_type, skill_name_for

IS_DRY   = "--dry-run" in sys.argv
USE_DEMO = "--demo"    in sys.argv

config = json.loads(Path("org-config.json").read_text())

PARSERS = {
    "objects":              (parse_objects,               "Custom objects & fields"),
    "flows":                (parse_flows,                 "Flows & automations"),
    "classes":              (parse_apex,                  "Apex classes"),
    "triggers":             (parse_apex,                  "Apex triggers"),
    "lwc":                  (parse_lwc,                   "LWC components"),
    "permissionsets":       (parse_permsets,               "Permission sets"),
    "profiles":              (parse_profiles,               "Profiles"),
    "layouts":               (parse_layouts,                "Page layouts"),
    "emailTemplates":        (parse_templates,              "Email templates"),
    "customMetadata":        (parse_custom_metadata,        "Custom Metadata"),
    "connectedApps":         (parse_connected_apps,         "Connected Apps"),
    "genAiPromptTemplates":  (parse_gen_ai_prompt_templates, "Prompt templates"),
    "flexipages":            (parse_flexipages,             "FlexiPages"),
    "approvalProcesses":     (parse_approval_processes,     "Approval Processes"),
}


def kebab(name: str) -> str:
    return re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '-', name).lower()


def resolve_src(config: dict, force_demo: bool) -> Path:
    src  = Path(config["srcDir"])
    demo = Path(config.get("demoDir", "demo-metadata"))
    if force_demo:
        return demo
    if not src.exists():
        return demo
    entries = [f for f in src.iterdir() if not f.name.startswith(".")]
    if not entries and config.get("useDemoIfSrcEmpty", True):
        return demo
    return src


def main():
    src_dir = resolve_src(config, USE_DEMO)
    ref_dir = Path(config["outputDir"]) / "reference"

    print(f"\n📂 Source: {src_dir}")
    print(f"📁 Skills: .claude/skills/  |  Reference: {ref_dir}\n")

    skill_count = 0
    reference_count = 0
    handled = set()
    # Some metadata types share one skill (classes + triggers -> salesforce-apex).
    # Parse everything first and merge array fields per skill before writing once,
    # so the second type parsed never silently overwrites the first's SKILL.md.
    skill_groups = {}  # skillName -> {'representativeType': str, 'parsed': dict}

    for mtype, (parser_fn, label) in PARSERS.items():
        if mtype not in config["metadataTypes"]:
            continue
        handled.add(mtype)

        type_dir = src_dir / mtype
        if not type_dir.exists():
            print(f"⚠  Skipping {mtype} — folder not found in {src_dir}")
            continue

        print(f"⚙  Parsing {label}...")
        try:
            parsed = parser_fn(str(type_dir))

            if is_skill_type(mtype):
                skill_name = skill_name_for(mtype)
                group = skill_groups.setdefault(skill_name, {'representativeType': mtype, 'parsed': {}})
                for key, value in parsed.items():
                    if not isinstance(value, list):
                        continue
                    group['parsed'].setdefault(key, [])
                    group['parsed'][key].extend(value)
        except Exception as e:
            print(f"   ✗ Error parsing {mtype}: {e}")

    for skill_name, group in skill_groups.items():
        result = generate_skill(group['representativeType'], group['parsed'], config)
        skill_dir = Path(".claude") / "skills" / skill_name
        ref_slug = re.sub(r'^salesforce-', '', skill_name)
        ref_path = skill_dir / "references" / f"{ref_slug}-reference.md"

        if not IS_DRY:
            skill_dir.mkdir(parents=True, exist_ok=True)
            ref_path.parent.mkdir(parents=True, exist_ok=True)
            (skill_dir / "SKILL.md").write_text(result['skillMd'], encoding="utf-8")
            ref_path.write_text(result['referenceMd'], encoding="utf-8")
            print(f"   ✓ {skill_dir / 'SKILL.md'}")
            skill_count += 1
        else:
            print(f"   [dry-run] would write → {skill_dir}/SKILL.md")

    # Auto-detect any remaining src/ subdirectories not covered by a dedicated parser.
    if src_dir.exists():
        for type_dir in sorted(p for p in src_dir.iterdir() if p.is_dir() and p.name not in handled):
            mtype = type_dir.name
            print(f"⚙  Parsing {mtype} (generic)...")
            try:
                parsed = parse_generic(str(type_dir))
                if not parsed["items"]:
                    continue

                reference_md = generate_reference(mtype, parsed, config)
                out_path = ref_dir / f"{kebab(mtype)}.md"

                if not IS_DRY:
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_text(reference_md, encoding="utf-8")
                    print(f"   ✓ {out_path}")
                    reference_count += 1
                else:
                    print(f"   [dry-run] would write → {out_path}")
            except Exception as e:
                print(f"   ✗ Error parsing {mtype}: {e}")

    print(f"\n✅ Done — {skill_count} skill(s), {reference_count} reference doc(s) generated.\n")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Verify with demo metadata (Node)**

Run: `node forge.js --demo`
Expected: output ends with `✅ Done — N skill(s), M reference doc(s) generated.`, and `.claude/skills/salesforce-objects/SKILL.md` (or whichever demo types exist) is created with YAML frontmatter at the top and a `references/` subfolder next to it.

- [ ] **Step 4: Verify with demo metadata (Python)**

Run: `python3 forge.py --demo`
Expected: same output shape; confirm `.claude/skills/salesforce-apex/SKILL.md` (or applicable) exists and its content matches the Node run's structure (frontmatter + instructions).

- [ ] **Step 5: Commit**

```bash
git add forge.js forge.py
git commit -m "Route dedicated types to .claude/skills/, auto-detect and route the rest to generated/reference/"
```

---

### Task 6: Config and script cleanup

**Files:**
- Modify: `org-config.json`
- Modify: `forge.sh`

- [ ] **Step 1: Update `org-config.json`**

```json
{
  "orgName": "Demo Org",
  "orgAlias": "demo",
  "srcDir": "src",
  "demoDir": "demo-metadata",
  "outputDir": "generated",
  "metadataTypes": [
    "objects",
    "flows",
    "classes",
    "triggers",
    "lwc",
    "permissionsets",
    "profiles",
    "layouts",
    "emailTemplates",
    "customMetadata",
    "connectedApps",
    "genAiPromptTemplates",
    "flexipages",
    "approvalProcesses"
  ],
  "skillFormat": "agent-skills",
  "dryRun": false,
  "useDemoIfSrcEmpty": true
}
```

- [ ] **Step 2: Remove the global push logic from `forge.sh`**

Replace the entire file content with:

```bash
#!/usr/bin/env bash
# sf-claude-context-forge — universal entry point
# Usage: ./forge.sh [--dry-run] [--demo] [--runtime node|python]

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     sf-claude-context-forge  v1.0.0     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Parse args
RUNTIME=""
EXTRA_ARGS=""
for arg in "$@"; do
  case $arg in
    --runtime=node) RUNTIME="node" ;;
    --runtime=python) RUNTIME="python" ;;
    --dry-run) EXTRA_ARGS="$EXTRA_ARGS --dry-run" ;;
    --demo) EXTRA_ARGS="$EXTRA_ARGS --demo" ;;
  esac
done

# Auto-detect runtime if not specified
if [ -z "$RUNTIME" ]; then
  if command -v node &>/dev/null; then
    RUNTIME="node"
    echo -e "${GREEN}✓ Detected Node.js $(node --version)${NC}"
  elif command -v python3 &>/dev/null; then
    RUNTIME="python"
    echo -e "${GREEN}✓ Detected Python $(python3 --version)${NC}"
  else
    echo -e "${RED}✗ No runtime found. Install Node.js 18+ or Python 3.10+${NC}"
    exit 1
  fi
fi

# Run with selected runtime
if [ "$RUNTIME" = "node" ]; then
  echo -e "${CYAN}▶ Running forge with Node.js...${NC}"
  node forge.js $EXTRA_ARGS
elif [ "$RUNTIME" = "python" ]; then
  echo -e "${CYAN}▶ Running forge with Python...${NC}"
  python3 forge.py $EXTRA_ARGS
fi

echo ""
echo -e "${GREEN}✓ Forge complete. Skills written to .claude/skills/, reference docs to generated/reference/${NC}"
```

- [ ] **Step 3: Commit**

```bash
git add org-config.json forge.sh
git commit -m "Drop global push config/logic; add new dedicated metadata types to org-config"
```

---

### Task 7: MCP configuration

**Files:**
- Create: `.mcp.json`

- [ ] **Step 1: Write `.mcp.json`**

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp", "--orgs", "demo"]
    }
  }
}
```

(The `--orgs` value mirrors `orgAlias` in `org-config.json`. A developer pointing this at their own org should update both to their authenticated org alias.)

- [ ] **Step 2: Commit**

```bash
git add .mcp.json
git commit -m "Add MCP config for the official Salesforce DX MCP server (@salesforce/mcp)"
```

---

### Task 8: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` in full**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Update README for .claude/skills output, expanded metadata coverage, and MCP setup"
```

---

### Task 9: Update CLAUDE.md, forge.md, create.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `forge.md`
- Modify: `create.md`

- [ ] **Step 1: Update `CLAUDE.md`'s directory structure, parser table, and workflow sections**

Read the current file first, then apply these targeted edits:
- In the directory structure block: change `generated/` (skills output) to `.claude/skills/` as the skill destination, keep `generated/reference/` for Tier-2 docs, and add the 5 new parser files to the `scripts/node/parsers/` and `scripts/python/parsers/` listings.
- In the "Parser modules" table: add rows for `customMetadataParser`, `connectedAppParser`, `genAiPromptTemplateParser`, `flexipageParser`, `approvalProcessParser`, and `genericParser` (fallback, used for any type without a dedicated row).
- In "How Claude should behave in this project" → "When asked to CREATE Salesforce metadata": change "Check if `generated/` contains relevant skill files" to "Check if `.claude/skills/` contains a relevant skill (e.g. `.claude/skills/salesforce-objects/SKILL.md`)".
- Add a short "MCP" note under "Key commands" pointing at `.mcp.json` and `@salesforce/mcp` for live org queries.

- [ ] **Step 2: Update `forge.md`**

Read the current file, then add a short section (or amend the existing workflow description) documenting: skills now land in `.claude/skills/` (auto-loaded, no push step); reference-only docs land in `generated/reference/`; and the recommended loop of retrieve → forge → (optionally) live-check via the `.mcp.json`-configured Salesforce MCP server.

- [ ] **Step 3: Update `create.md`**

Read the current file, then update any reference to reading skills from `generated/` to instead read from `.claude/skills/<name>/SKILL.md` (+ its `references/` file), and note that live org state is also queryable via the MCP tools configured in `.mcp.json` if a more up-to-date check is needed before creating something.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md forge.md create.md
git commit -m "Sync CLAUDE.md, forge.md, create.md with .claude/skills output and MCP workflow"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Clean previous demo output and re-run both runtimes**

```bash
rm -rf .claude/skills generated/reference
node forge.js --demo
python3 forge.py --demo
```
Expected: both runs report the same skill/reference counts; `.claude/skills/` contains one directory per Tier-1 type found in `demo-metadata/`, each with `SKILL.md` + `references/*.md`.

- [ ] **Step 2: Spot-check one skill file's frontmatter**

Run: `head -5 .claude/skills/salesforce-objects/SKILL.md` (or whichever skill demo-metadata produced)
Expected:
```
---
name: salesforce-objects
description: Conventions for creating custom objects and fields in this org. ...
---
```

- [ ] **Step 3: Confirm no crash against the current (mostly empty) `src/`**

```bash
node forge.js
python3 forge.py
```
Expected: given every folder in `src/` is currently empty (see design spec), forge should fall back to demo metadata per `useDemoIfSrcEmpty`, or if that flag is bypassed, complete without throwing — either way, no unhandled exception.

- [ ] **Step 4: Final commit if any fixes were needed during verification**

```bash
git add -A
git commit -m "Fix issues found during end-to-end forge verification"
```
(Skip this step if verification passed with no changes.)
