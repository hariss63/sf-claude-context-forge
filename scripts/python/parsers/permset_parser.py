"""
permset_parser.py
Reads Salesforce Permission Set metadata from SFDX source format.
Uses stdlib only (re, pathlib).
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str):
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _count_tags(xml: str, tag: str) -> int:
    return len(re.findall(rf'<{tag}[^>]*>', xml))


def parse_permsets(permset_dir: str) -> dict:
    """
    Parse all permission sets under permset_dir.
    Returns {'permsets': [{'apiName', 'label', 'description', 'objectPerms', 'fieldPerms'}]}
    """
    permsets = []
    p = Path(permset_dir)

    if not p.exists():
        return {'permsets': permsets}

    for ff in sorted(p.glob('*.permissionset-meta.xml')):
        xml = ff.read_text(encoding='utf-8')
        api_name = ff.name.replace('.permissionset-meta.xml', '')
        permsets.append({
            'apiName': api_name,
            'label': _extract_tag(xml, 'label'),
            'description': _extract_tag(xml, 'description'),
            'objectPerms': _count_tags(xml, 'objectPermissions'),
            'fieldPerms': _count_tags(xml, 'fieldPermissions'),
        })

    return {'permsets': permsets}
