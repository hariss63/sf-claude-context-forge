'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Custom Permission metadata from SFDX source format.
 * @param {string} typeDir - path to the customPermissions/ folder
 * @returns {{ permissions: Array }}
 */
async function parseCustomPermissions(typeDir) {
  const permissions = [];
  if (!fs.existsSync(typeDir)) return { permissions };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.customPermission-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    permissions.push({
      apiName:            file.replace('.customPermission-meta.xml', ''),
      label:              extractTag(xml, 'label'),
      description:        extractTag(xml, 'description'),
      isSessionActivated: extractTag(xml, 'isSessionActivated') === 'true',
    });
  }

  return { permissions };
}

module.exports = { parseCustomPermissions };
