'use strict';

const fs   = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads Dashboard metadata from SFDX source format (dashboards are nested in folders).
 * @param {string} typeDir - path to the dashboards/ folder
 * @returns {{ dashboards: Array }}
 */
async function parseDashboards(typeDir) {
  const dashboards = [];
  if (!fs.existsSync(typeDir)) return { dashboards };

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.dashboard-meta.xml')) {
        const xml = fs.readFileSync(full, 'utf8');
        dashboards.push({
          name:        entry.name.replace('.dashboard-meta.xml', ''),
          title:       extractTag(xml, 'title'),
          description: extractTag(xml, 'description'),
        });
      }
    }
  };

  walk(typeDir);
  return { dashboards };
}

module.exports = { parseDashboards };
