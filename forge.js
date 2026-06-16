#!/usr/bin/env node
/**
 * sf-claude-context-forge — Node.js entry point
 * Orchestrates parsing of SF metadata and generation of Claude skill files.
 */

const fs = require('fs');
const path = require('path');
const { parseObjects }      = require('./scripts/node/parsers/objectParser');
const { parseFlows }        = require('./scripts/node/parsers/flowParser');
const { parseApex }         = require('./scripts/node/parsers/apexParser');
const { parseLwc }          = require('./scripts/node/parsers/lwcParser');
const { parsePermsets }     = require('./scripts/node/parsers/permsetParser');
const { parseProfiles }     = require('./scripts/node/parsers/profileParser');
const { parseLayouts }      = require('./scripts/node/parsers/layoutParser');
const { parseTemplates }    = require('./scripts/node/parsers/templateParser');
const { generateSkill }     = require('./scripts/node/generator');

const args    = process.argv.slice(2);
const isDry   = args.includes('--dry-run');
const useDemo = args.includes('--demo');

const config  = JSON.parse(fs.readFileSync('./org-config.json', 'utf8'));

// Resolve source directory
const srcDir = resolveSourceDir(config, useDemo);
console.log(`\n📂 Source: ${srcDir}`);
console.log(`📁 Output: ${config.outputDir}\n`);

const PARSERS = {
  objects:         { parser: parseObjects,   outDir: 'objects',   label: 'Custom objects & fields' },
  flows:           { parser: parseFlows,     outDir: 'flows',     label: 'Flows & automations'     },
  classes:         { parser: parseApex,      outDir: 'apex',      label: 'Apex classes'            },
  triggers:        { parser: parseApex,      outDir: 'apex',      label: 'Apex triggers'           },
  lwc:             { parser: parseLwc,       outDir: 'lwc',       label: 'LWC components'          },
  permissionsets:  { parser: parsePermsets,  outDir: 'perms',     label: 'Permission sets'         },
  profiles:        { parser: parseProfiles,  outDir: 'profiles',  label: 'Profiles'                },
  layouts:         { parser: parseLayouts,   outDir: 'layouts',   label: 'Page layouts'            },
  emailTemplates:  { parser: parseTemplates, outDir: 'templates', label: 'Email templates'         },
};

async function run() {
  let totalGenerated = 0;

  for (const type of config.metadataTypes) {
    const entry  = PARSERS[type];
    if (!entry) continue;

    const typeDir = path.join(srcDir, type);
    if (!fs.existsSync(typeDir)) {
      console.log(`⚠  Skipping ${type} — folder not found in ${srcDir}`);
      continue;
    }

    console.log(`⚙  Parsing ${entry.label}...`);
    try {
      const parsed  = await entry.parser(typeDir);
      const outPath = path.join(config.outputDir, entry.outDir, `${type}.md`);

      if (!isDry) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const skill = generateSkill(type, parsed, config);
        fs.writeFileSync(outPath, skill, 'utf8');
        console.log(`   ✓ ${outPath}`);
        totalGenerated++;
      } else {
        console.log(`   [dry-run] would write → ${outPath}`);
      }
    } catch (err) {
      console.error(`   ✗ Error parsing ${type}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done — ${totalGenerated} skill file(s) generated.\n`);
}

function resolveSourceDir(config, forceDemo) {
  const src  = path.resolve(config.srcDir);
  const demo = path.resolve(config.demoDir || 'demo-metadata');

  if (forceDemo) return demo;

  // Use demo if src/ is empty or missing
  if (!fs.existsSync(src)) return demo;
  const entries = fs.readdirSync(src).filter(f => !f.startsWith('.'));
  if (entries.length === 0 && config.useDemoIfSrcEmpty) return demo;

  return src;
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
