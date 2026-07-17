'use strict';

const fs = require('fs');
const path = require('path');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Reads GenAI Prompt Template (Prompt Builder / Agentforce) metadata.
 * @param {string} typeDir - path to the genAiPromptTemplates/ folder
 * @returns {{ templates: Array }}
 */
async function parseGenAiPromptTemplates(typeDir) {
  const templates = [];
  if (!fs.existsSync(typeDir)) return { templates };

  const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.genAiPromptTemplate-meta.xml'));

  for (const file of files) {
    const xml = fs.readFileSync(path.join(typeDir, file), 'utf8');
    templates.push({
      apiName: file.replace('.genAiPromptTemplate-meta.xml', ''),
      masterLabel: extractTag(xml, 'masterLabel'),
      templateType: extractTag(xml, 'templateType'),
      description: extractTag(xml, 'description'),
      content: extractTag(xml, 'content'),
    });
  }

  return { templates };
}

module.exports = { parseGenAiPromptTemplates };
