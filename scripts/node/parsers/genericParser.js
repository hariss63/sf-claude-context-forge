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
