'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Custom App (Lightning App) metadata from SFDX source format.
 * @param {string} typeDir - path to the applications/ folder
 * @returns {{ apps: Array }}
 */
async function parseApplications(typeDir) {
  const apps = [];
  if (!fs.existsSync(typeDir)) return { apps };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.app-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    apps.push({
      apiName:     file.replace('.app-meta.xml', ''),
      label:       extractTag(xml, 'label'),
      description: extractTag(xml, 'description'),
      navType:     extractTag(xml, 'navType') || 'Standard',
    });
  }

  return { apps };
}

module.exports = { parseApplications };
