# Design: Full-coverage forge, native Agent Skills output, and MCP integration

Date: 2026-07-17

## Problem

`sf-claude-context-forge` currently:
- Parses only 9 of the 40+ metadata types Salesforce can retrieve (objects, flows, classes,
  triggers, lwc, permissionsets, profiles, layouts, emailTemplates). Any other type present in
  `src/` (dashboards, flexipages, connectedApps, customMetadata, genAiPromptTemplates, etc.) is
  silently skipped.
- Emits flat Markdown files into `generated/`, which Claude Code does not auto-discover as
  skills — a developer has to manually tell Claude to read them.
- Has no MCP configuration, so Claude has no live-org query capability; it only ever sees
  whatever was last retrieved into `src/`.

Goal: once a developer retrieves their org's metadata into `src/`, forging should (a) produce a
skill for every metadata type that's actually useful to have as a skill, in the native Agent
Skills format Claude Code auto-loads, and (b) be complemented by live org access via the
official Salesforce MCP server.

## Non-goals

- Actually running `sf project retrieve` against a live org (no org is authenticated in this
  environment).
- Dedicated parsers for the long tail of low-value config metadata (certs, CORS origins, auth
  providers, call centers, etc.) — these fall back to the generic parser and a plain reference
  doc.
- Any change to the "no external dependencies" constraint on `forge.js`/`forge.py`.

## Design

### 1. Generic fallback parser

New `scripts/node/parsers/genericParser.js` / `scripts/python/parsers/generic_parser.py`.

Given a metadata type's directory, walks all `*-meta.xml` files (one level deep, matching the
flat-file convention most declarative metadata uses) and for each extracts:
- `apiName` — derived from the filename (strip the `.<type>-meta.xml` suffix)
- `label` — from `<label>` or `<masterLabel>` if present
- `fullName` — from `<fullName>` if present
- `description` — from `<description>` if present

Returns `{ items: [...] }`. This becomes the parser of last resort for any metadata type that
has no dedicated parser, so nothing retrieved into `src/` is ever silently dropped.

### 2. New dedicated parsers

Five new dedicated parsers, one file-per-entity types where a richer, purpose-built extraction
is worth the code:

| Type | Parser | Key fields extracted |
|---|---|---|
| `customMetadata` | `customMetadataParser` | apiName, label, protected, values (field/value pairs) |
| `connectedApps` | `connectedAppParser` | label, contactEmail, oauth scopes |
| `genAiPromptTemplates` | `genAiPromptTemplateParser` | label, templateType, template body |
| `flexipages` | `flexipageParser` | masterLabel, type (AppPage/RecordPage/HomePage) |
| `approvalProcesses` | `approvalProcessParser` | label, active, entity (object), description |

Each follows the existing parser convention: stdlib-only regex XML extraction (Node) /
`re`-based extraction (Python), same function signature shape as `parseObjects` /
`parse_objects`.

### 3. Two-tier generator output

`generateSkill()` / `generate_skill()` gains a `tier` per metadata type, declared in a
registration table:

- **`skill` tier** (creatable/code-authoring types): the existing 9 plus the 5 new dedicated
  types above = 14 types. Each produces a directory:
  ```
  .claude/skills/<skill-name>/
    SKILL.md                      # frontmatter (name, description) + creation instructions
    references/<type>-reference.md  # the detailed org-specific inventory (today's content)
  ```
  `SKILL.md` stays short and actionable (when to use, naming conventions, design rules — the
  parts of today's builders that aren't a raw inventory dump). The inventory dump moves into
  `references/<type>-reference.md`, which `SKILL.md` links to.

- **`reference` tier** (everything else, parsed via the generic parser): plain Markdown at
  `generated/reference/<type>.md` — name/label/description inventory only, not auto-loaded as a
  skill.

Skill directory names (kebab-case, mirroring `forcedotcom/afv-library` conventions):
`salesforce-objects`, `salesforce-apex`, `salesforce-flows`, `salesforce-lwc`,
`salesforce-permission-sets`, `salesforce-profiles`, `salesforce-layouts`,
`salesforce-email-templates`, `salesforce-custom-metadata`, `salesforce-connected-apps`,
`salesforce-prompt-templates`, `salesforce-flexipages`, `salesforce-approval-processes`.

(Note: `classes` and `triggers` continue to share one skill, `salesforce-apex`, as they do
today.)

### 4. Output location

Skills write directly to `.claude/skills/` in this repo (project-local, versioned, auto-loaded
by Claude Code — no manual push step). `generated/` is repurposed to hold only Tier 2 reference
docs (`generated/reference/<type>.md`).

`forge.sh`'s `--push` / `claudeSkillsDir` / `reviewBeforePush` global-push logic is removed
(superseded by project-local auto-discovery). `org-config.json` drops `pushToClaudeCode`,
`claudeSkillsDir`, `reviewBeforePush`; `outputDir` narrows to mean "reference docs only"; and
`metadataTypes` gains entries for the 5 new dedicated types. Reference-tier types are not
enumerated in config at all — forge auto-detects them at runtime (see §5) so the long tail never
needs a config entry.

### 5. forge.js / forge.py orchestration changes

- Build the dedicated-type list from the registration table (9 existing + 5 new).
- After processing dedicated types, scan `srcDir` for any remaining subdirectories not in the
  dedicated list, and run each through the generic parser + reference-tier generator
  automatically. This is what fulfills "create all the relevant skills once the user retrieves
  all the source metadata" — no per-type config entry required for the long tail.
- `--dry-run` and `--demo` behavior unchanged.

### 6. MCP integration

New `.mcp.json` at repo root:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp", "--orgs", "<orgAlias from org-config.json>"]
    }
  }
}
```
No changes to `forge.js`/`forge.py` — this is a standalone MCP server config, keeping the forge
scripts dependency-free per `CLAUDE.md`. `forge.md`/`create.md` gain a short section documenting
the loop: authenticate → retrieve into `src/` (via `sf` CLI or MCP tools) → run forge → skills
refresh.

### 7. Documentation updates

- `README.md`: quick start, repo structure, and `org-config.json` example all updated to reflect
  `.claude/skills/` as the skill destination, the expanded metadata type table, and the new MCP
  setup step.
- `CLAUDE.md`: directory structure, parser module table, and "how Claude should behave" sections
  updated to match (kept in sync since it directly documents the architecture being changed).

## Testing / validation

No existing test suite in this repo. Validation is manual: run `./forge.sh --demo` (or
`node forge.js --demo`) against `demo-metadata/` and confirm:
- The 9 existing types still produce `.claude/skills/<name>/SKILL.md` + reference file.
- Demo metadata that happens to include any non-dedicated type (if present) produces a
  `generated/reference/<type>.md`.
- No crash on metadata types with zero files (empty dirs, matching current `src/` state).

## Open questions resolved during brainstorming

- Dedicated vs generic split: two-tier (skill vs reference), confirmed.
- Skill location: project-local `.claude/skills/`, confirmed.
- MCP scope: config-only via official `@salesforce/mcp`, confirmed.
