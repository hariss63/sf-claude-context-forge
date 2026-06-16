/**
 * flowParser.js
 * Reads Salesforce Flow metadata from SFDX source format.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

async function parseFlows(flowsDir) {
  const flows = [];

  if (!fs.existsSync(flowsDir)) return { flows };

  const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.flow-meta.xml'));

  for (const file of files) {
    const xml  = fs.readFileSync(path.join(flowsDir, file), 'utf8');
    const name = file.replace('.flow-meta.xml', '');
    flows.push({
      apiName:     name,
      label:       extractTag(xml, 'label'),
      processType: extractTag(xml, 'processType'),
      triggerType: extractTag(xml, 'triggerType'),
      object:      extractTag(xml, 'object'),
      status:      extractTag(xml, 'status'),
      description: extractTag(xml, 'description'),
    });
  }

  return { flows };
}

module.exports = { parseFlows };
