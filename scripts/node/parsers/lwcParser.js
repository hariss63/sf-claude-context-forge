/**
 * lwcParser.js
 * Reads Salesforce Lightning Web Component metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * @param {string} lwcDir  - path to the lwc/ folder
 * @returns {{ components: Array<{ name, files, hasApexWire, hasLds }> }}
 */
async function parseLwc(lwcDir) {
  const components = [];

  if (!fs.existsSync(lwcDir)) return { components };

  const entries = fs.readdirSync(lwcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const cmpDir = path.join(lwcDir, entry.name);
    const files  = fs.readdirSync(cmpDir);

    let hasApexWire = false;
    let hasLds      = false;

    for (const file of files) {
      if (!file.endsWith('.js') || file.endsWith('.js-meta.xml')) continue;
      const body = fs.readFileSync(path.join(cmpDir, file), 'utf8');

      // Detect @wire with Apex import
      if (/@wire/.test(body) && /from\s+['"]@salesforce\/apex/.test(body)) {
        hasApexWire = true;
      }

      // Detect Lightning Data Service (getRecord, getFieldValue, etc.)
      if (/from\s+['"]lightning\/uiRecordApi['"]/.test(body) ||
          /from\s+['"]lightning\/uiObjectInfoApi['"]/.test(body)) {
        hasLds = true;
      }
    }

    components.push({
      name: entry.name,
      files,
      hasApexWire,
      hasLds,
    });
  }

  return { components };
}

module.exports = { parseLwc };
