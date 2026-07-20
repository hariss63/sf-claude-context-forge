'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Report metadata from SFDX source format (reports are nested in folders).
 * @param {string} typeDir - path to the reports/ folder
 * @returns {{ reports: Array }}
 */
async function parseReports(typeDir) {
  const reports = [];
  if (!fs.existsSync(typeDir)) return { reports };

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.report-meta.xml')) {
        const xml = fs.readFileSync(full, 'utf8');
        reports.push({
          name:        entry.name.replace('.report-meta.xml', ''),
          reportType:  extractTag(xml, 'reportType'),
          format:      extractTag(xml, 'format'),
          description: extractTag(xml, 'description'),
        });
      }
    }
  };

  walk(typeDir);
  return { reports };
}

module.exports = { parseReports };
