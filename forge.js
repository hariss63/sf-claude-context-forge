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
