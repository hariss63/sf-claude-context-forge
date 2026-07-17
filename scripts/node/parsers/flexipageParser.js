'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads FlexiPage (Lightning App Builder) metadata.
 * @param {string} typeDir - path to the flexipages/ folder
 * @returns {{ pages: Array }}
 */
async function parseFlexipages(typeDir) {
  const pages = [];
  if (!fs.existsSync(typeDir)) return { pages };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.flexipage-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    pages.push({
      apiName: file.replace('.flexipage-meta.xml', ''),
      masterLabel: extractTag(xml, 'masterLabel'),
      type: extractTag(xml, 'type'),
      sobjectType: extractTag(xml, 'sobjectType'),
    });
  }

  return { pages };
}

module.exports = { parseFlexipages };
