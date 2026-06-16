/**
 * templateParser.js
 * Reads Salesforce Email Template metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * @param {string} templatesDir  - path to the email templates folder
 * @returns {{ templates: Array<{ name, subject, encoding }> }}
 */
async function parseTemplates(templatesDir) {
  const templates = [];

  if (!fs.existsSync(templatesDir)) return { templates };

  const files = fs.readdirSync(templatesDir).filter(
    f => f.endsWith('.email-meta.xml') || f.endsWith('.emailTemplate-meta.xml')
  );

  for (const file of files) {
    const xml  = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    const name = file.replace(/\.(email|emailTemplate)-meta\.xml$/, '');

    templates.push({
      name,
      subject:  extractTag(xml, 'subject'),
      encoding: extractTag(xml, 'encodingKey'),
    });
  }

  return { templates };
}

module.exports = { parseTemplates };
