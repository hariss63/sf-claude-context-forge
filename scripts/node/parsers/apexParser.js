/**
 * apexParser.js
 * Reads Salesforce Apex class and trigger metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * @param {string} apexDir  - path to classes/ or triggers/ folder
 * @returns {{ classes: Array, triggers: Array }}
 */
async function parseApex(apexDir) {
  const classes  = [];
  const triggers = [];

  if (!fs.existsSync(apexDir)) return { classes, triggers };

  const files = fs.readdirSync(apexDir);

  for (const file of files) {
    const fullPath = path.join(apexDir, file);

    // Parse class bodies
    if (file.endsWith('.cls')) {
      const body    = fs.readFileSync(fullPath, 'utf8');
      const name    = file.replace('.cls', '');
      const isTest  = /@isTest/i.test(body);
      const sharing = body.match(/\b(with|without|inherited)\s+sharing\b/i)?.[0] || null;

      classes.push({ name, isTest, sharing, lines: body.split('\n').length });
    }

    // Parse trigger bodies
    if (file.endsWith('.trigger')) {
      const body   = fs.readFileSync(fullPath, 'utf8');
      const name   = file.replace('.trigger', '');
      const objM   = body.match(/trigger\s+\w+\s+on\s+(\w+)/i);
      const evtM   = body.match(/on\s+\w+\s*\(([^)]+)\)/i);
      const object = objM?.[1] || null;
      const events = evtM?.[1].split(',').map(e => e.trim()) || [];

      triggers.push({ name, object, events, lines: body.split('\n').length });
    }
  }

  return { classes, triggers };
}

module.exports = { parseApex };
