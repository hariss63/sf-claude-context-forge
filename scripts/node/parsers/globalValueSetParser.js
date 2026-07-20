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
 * Reads Global Value Set metadata from SFDX source format.
 * @param {string} typeDir - path to the globalValueSets/ folder
 * @returns {{ valueSets: Array }}
 */
async function parseGlobalValueSets(typeDir) {
  const valueSets = [];
  if (!fs.existsSync(typeDir)) return { valueSets };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.globalValueSet-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    const apiName = file.replace('.globalValueSet-meta.xml', '');

    const valueBlocks = extractAllBlocks(xml, 'customValue');
    const values = valueBlocks.map(block => ({
      value:     extractTag(block, 'fullName'),
      label:     extractTag(block, 'label'),
      isDefault: extractTag(block, 'default') === 'true',
      isActive:  extractTag(block, 'isActive') !== 'false',
    }));

    valueSets.push({
      apiName,
      masterLabel: extractTag(xml, 'masterLabel') || apiName,
      sorted:      extractTag(xml, 'sorted') === 'true',
      values,
    });
  }

  return { valueSets };
}

module.exports = { parseGlobalValueSets };
