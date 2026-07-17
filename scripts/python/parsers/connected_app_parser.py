"""
connected_app_parser.py
Reads Salesforce Connected App metadata from SFDX source format.
Parses .connectedApp-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _extract_all(xml: str, tag: str) -> list[str]:
    return [v.strip() for v in re.findall(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)]


def parse_connected_apps(type_dir: str) -> dict:
    """Parse all *.connectedApp-meta.xml files in a connectedApps/ folder."""
    apps = []
    root = Path(type_dir)
    if not root.exists():
        return {'apps': apps}

    for file in sorted(root.glob('*.connectedApp-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        apps.append({
            'apiName': file.name.replace('.connectedApp-meta.xml', ''),
            'label': _extract_tag(xml, 'label'),
            'contactEmail': _extract_tag(xml, 'contactEmail'),
            'description': _extract_tag(xml, 'description'),
            'scopes': _extract_all(xml, 'scopes'),
        })

    return {'apps': apps}
