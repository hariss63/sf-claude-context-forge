'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Static Resource metadata from SFDX source format.
 * @param {string} typeDir - path to the staticresources/ folder
 * @returns {{ resources: Array }}
 */
async function parseStaticResources(typeDir) {
  const resources = [];
  if (!fs.existsSync(typeDir)) return { resources };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.resource-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    resources.push({
      apiName:      file.replace('.resource-meta.xml', ''),
      contentType:  extractTag(xml, 'contentType'),
      cacheControl: extractTag(xml, 'cacheControl'),
    });
  }

  return { resources };
}

module.exports = { parseStaticResources };
