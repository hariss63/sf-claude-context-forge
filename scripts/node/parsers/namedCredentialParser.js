'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Named Credential metadata from SFDX source format.
 * @param {string} typeDir - path to the namedCredentials/ folder
 * @returns {{ credentials: Array }}
 */
async function parseNamedCredentials(typeDir) {
  const credentials = [];
  if (!fs.existsSync(typeDir)) return { credentials };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.namedCredential-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    credentials.push({
      apiName:        file.replace('.namedCredential-meta.xml', ''),
      label:          extractTag(xml, 'label'),
      endpoint:       extractTag(xml, 'endpoint'),
      principalType:  extractTag(xml, 'principalType'),
      protocol:       extractTag(xml, 'protocol'),
    });
  }

  return { credentials };
}

module.exports = { parseNamedCredentials };
