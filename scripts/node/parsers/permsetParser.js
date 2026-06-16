/**
 * permsetParser.js
 * Reads Salesforce Permission Set metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function countTags(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>`, 'g');
  return (xml.match(re) || []).length;
}

/**
 * @param {string} permsetDir  - path to the permissionsets/ folder
 * @returns {{ permsets: Array<{ apiName, label, description, objectPerms, fieldPerms }> }}
 */
async function parsePermsets(permsetDir) {
  const permsets = [];

  if (!fs.existsSync(permsetDir)) return { permsets };

  const files = fs.readdirSync(permsetDir).filter(f => f.endsWith('.permissionset-meta.xml'));

  for (const file of files) {
    const xml     = fs.readFileSync(path.join(permsetDir, file), 'utf8');
    const apiName = file.replace('.permissionset-meta.xml', '');

    permsets.push({
      apiName,
      label:       extractTag(xml, 'label'),
      description: extractTag(xml, 'description'),
      objectPerms: countTags(xml, 'objectPermissions'),
      fieldPerms:  countTags(xml, 'fieldPermissions'),
    });
  }

  return { permsets };
}

module.exports = { parsePermsets };
