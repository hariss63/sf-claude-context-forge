/**
 * layoutParser.js
 * Reads Salesforce Page Layout metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * @param {string} layoutDir  - path to the layouts/ folder
 * @returns {{ layouts: Array<{ name }> }}
 */
async function parseLayouts(layoutDir) {
  const layouts = [];

  if (!fs.existsSync(layoutDir)) return { layouts };

  const files = fs.readdirSync(layoutDir).filter(f => f.endsWith('.layout-meta.xml'));

  for (const file of files) {
    const name = file.replace('.layout-meta.xml', '');
    layouts.push({ name });
  }

  return { layouts };
}

module.exports = { parseLayouts };
