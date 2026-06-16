/**
 * profileParser.js
 * Reads Salesforce Profile metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * @param {string} profileDir  - path to the profiles/ folder
 * @returns {{ profiles: Array<{ name }> }}
 */
async function parseProfiles(profileDir) {
  const profiles = [];

  if (!fs.existsSync(profileDir)) return { profiles };

  const files = fs.readdirSync(profileDir).filter(f => f.endsWith('.profile-meta.xml'));

  for (const file of files) {
    const name = file.replace('.profile-meta.xml', '');
    profiles.push({ name });
  }

  return { profiles };
}

module.exports = { parseProfiles };
