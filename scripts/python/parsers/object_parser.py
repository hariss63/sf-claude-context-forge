"""
object_parser.py
Reads Salesforce custom object metadata from SFDX source format.
Uses stdlib only (re, os, pathlib).
"""

import os
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str):
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_objects(objects_dir: str) -> dict:
    """
    Parse all custom objects under objects_dir.
    Returns {'objects': [{'apiName', 'label', 'description', 'fields': [...]}]}
    """
    objects = []
    p = Path(objects_dir)

    if not p.exists():
        return {'objects': objects}

    for obj_dir in sorted(p.iterdir()):
        if not obj_dir.is_dir():
            continue

        obj = {'apiName': obj_dir.name, 'fields': []}
        obj_file = obj_dir / f'{obj_dir.name}.object-meta.xml'

        if obj_file.exists():
            xml = obj_file.read_text(encoding='utf-8')
            obj['label'] = _extract_tag(xml, 'label')
            obj['description'] = _extract_tag(xml, 'description')
            obj['pluralLabel'] = _extract_tag(xml, 'pluralLabel')
            obj['sharingModel'] = _extract_tag(xml, 'sharingModel')

        fields_dir = obj_dir / 'fields'
        if fields_dir.exists():
            for ff in sorted(fields_dir.glob('*.field-meta.xml')):
                fxml = ff.read_text(encoding='utf-8')
                api_name = ff.name.replace('.field-meta.xml', '')
                required_val = _extract_tag(fxml, 'required')
                obj['fields'].append({
                    'apiName': api_name,
                    'type': _extract_tag(fxml, 'type'),
                    'label': _extract_tag(fxml, 'label'),
                    'required': required_val == 'true',
                    'description': _extract_tag(fxml, 'description'),
                    'length': _extract_tag(fxml, 'length'),
                })

        objects.append(obj)

    return {'objects': objects}
