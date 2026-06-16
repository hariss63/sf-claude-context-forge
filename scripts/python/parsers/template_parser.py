"""
template_parser.py
Reads Salesforce Email Template metadata from SFDX source format.
Uses stdlib only (re, pathlib).
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str):
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_templates(templates_dir: str) -> dict:
    """
    Parse all email templates under templates_dir.
    Returns {'templates': [{'name', 'subject', 'encoding'}]}
    """
    templates = []
    p = Path(templates_dir)

    if not p.exists():
        return {'templates': templates}

    for ff in sorted(p.iterdir()):
        if not (ff.name.endswith('.email-meta.xml') or ff.name.endswith('.emailTemplate-meta.xml')):
            continue
        xml = ff.read_text(encoding='utf-8')
        name = re.sub(r'\.(email|emailTemplate)-meta\.xml$', '', ff.name)
        templates.append({
            'name': name,
            'subject': _extract_tag(xml, 'subject'),
            'encoding': _extract_tag(xml, 'encodingKey'),
        })

    return {'templates': templates}
