'use strict';

const fs   = require('fs');
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
 * Reads Assignment Rules metadata from SFDX source format.
 * File naming: <ObjectName>.assignmentRules-meta.xml
 * @param {string} typeDir - path to the assignmentRules/ folder
 * @returns {{ rulesets: Array }}
 */
async function parseAssignmentRules(typeDir) {
  const rulesets = [];
  if (!fs.existsSync(typeDir)) return { rulesets };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.assignmentRules-meta.xml'));

  for (const file of files) {
    const xml      = fs.readFileSync(path.join(typeDir, file), 'utf8');
    const object   = file.replace('.assignmentRules-meta.xml', '');
    const blocks   = extractAllBlocks(xml, 'assignmentRule');

    const rules = blocks.map(block => ({
      name:   extractTag(block, 'fullName'),
      active: extractTag(block, 'active') === 'true',
    }));

    rulesets.push({ object, activeRules: rules.filter(r => r.active).length, totalRules: rules.length, rules });
  }

  return { rulesets };
}

module.exports = { parseAssignmentRules };
