'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads External Credential metadata from SFDX source format.
 * @param {string} typeDir - path to the externalCredentials/ folder
 * @returns {{ credentials: Array }}
 */
async function parseExternalCredentials(typeDir) {
  const credentials = [];
  if (!fs.existsSync(typeDir)) return { credentials };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.externalCredential-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    credentials.push({
      apiName:                file.replace('.externalCredential-meta.xml', ''),
      label:                  extractTag(xml, 'label'),
      description:            extractTag(xml, 'description'),
      authenticationProtocol: extractTag(xml, 'authenticationProtocol'),
    });
  }

  return { credentials };
}

module.exports = { parseExternalCredentials };
