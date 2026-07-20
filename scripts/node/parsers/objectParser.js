/**
 * objectParser.js
 * Reads Salesforce custom object metadata from SFDX source format.
 * Parses .object-meta.xml and .field-meta.xml files.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Lightweight XML value extractor — avoids a heavy XML dependency
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

/**
 * @param {string} objectsDir  - path to the objects/ folder
 * @returns {{ objects: Array }}
 */
async function parseObjects(objectsDir) {
  const objects = [];

  if (!fs.existsSync(objectsDir)) return { objects };

  const entries = fs.readdirSync(objectsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const objDir  = path.join(objectsDir, entry.name);
    const objFile = path.join(objDir, `${entry.name}.object-meta.xml`);

    const obj = { apiName: entry.name, fields: [] };

    // Parse top-level object XML
    if (fs.existsSync(objFile)) {
      const xml         = fs.readFileSync(objFile, 'utf8');
      obj.label         = extractTag(xml, 'label');
      obj.description   = extractTag(xml, 'description');
      obj.pluralLabel   = extractTag(xml, 'pluralLabel');
      obj.sharingModel  = extractTag(xml, 'sharingModel');
    }

    // Parse individual field files
    const fieldsDir = path.join(objDir, 'fields');
    if (fs.existsSync(fieldsDir)) {
      const fieldFiles = fs.readdirSync(fieldsDir).filter(f => f.endsWith('.field-meta.xml'));
      for (const ff of fieldFiles) {
        const fxml     = fs.readFileSync(path.join(fieldsDir, ff), 'utf8');
        const apiName  = ff.replace('.field-meta.xml', '');
        obj.fields.push({
          apiName,
          type:        extractTag(fxml, 'type'),
          label:       extractTag(fxml, 'label'),
          required:    extractTag(fxml, 'required') === 'true',
          description: extractTag(fxml, 'description'),
          length:      extractTag(fxml, 'length'),
        });
      }
    }

    // Parse validation rule files
    obj.validationRules = [];
    const vrDir = path.join(objDir, 'validationRules');
    if (fs.existsSync(vrDir)) {
      for (const vf of fs.readdirSync(vrDir).filter(f => f.endsWith('.validationRule-meta.xml'))) {
        const vxml = fs.readFileSync(path.join(vrDir, vf), 'utf8');
        obj.validationRules.push({
          name:         vf.replace('.validationRule-meta.xml', ''),
          active:       extractTag(vxml, 'active') !== 'false',
          errorMessage: extractTag(vxml, 'errorMessage'),
          formula:      extractTag(vxml, 'errorConditionFormula'),
        });
      }
    }

    // Parse record type files
    obj.recordTypes = [];
    const rtDir = path.join(objDir, 'recordTypes');
    if (fs.existsSync(rtDir)) {
      for (const rf of fs.readdirSync(rtDir).filter(f => f.endsWith('.recordType-meta.xml'))) {
        const rxml = fs.readFileSync(path.join(rtDir, rf), 'utf8');
        obj.recordTypes.push({
          name:        rf.replace('.recordType-meta.xml', ''),
          label:       extractTag(rxml, 'label'),
          active:      extractTag(rxml, 'active') !== 'false',
          description: extractTag(rxml, 'description'),
        });
      }
    }

    objects.push(obj);
  }

  return { objects };
}

module.exports = { parseObjects };
