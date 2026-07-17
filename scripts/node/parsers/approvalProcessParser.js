'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Approval Process metadata.
 * @param {string} typeDir - path to the approvalProcesses/ folder
 * @returns {{ processes: Array }}
 */
async function parseApprovalProcesses(typeDir) {
  const processes = [];
  if (!fs.existsSync(typeDir)) return { processes };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.approvalProcess-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    const fullName = file.replace('.approvalProcess-meta.xml', '');
    const entity = fullName.split('.')[0];

    processes.push({
      fullName,
      entity,
      label: extractTag(xml, 'label'),
      active: extractTag(xml, 'active') === 'true',
      description: extractTag(xml, 'description'),
    });
  }

  return { processes };
}

module.exports = { parseApprovalProcesses };
