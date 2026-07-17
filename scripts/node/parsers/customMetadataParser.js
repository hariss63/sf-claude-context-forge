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
