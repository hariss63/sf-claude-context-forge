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
