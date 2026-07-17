"""
generic_parser.py
Fallback parser for any metadata type without a dedicated parser.
Extracts apiName/label/fullName/description from *-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _derive_api_name(file_name: str) -> str:
    return re.sub(r'\.[a-zA-Z]+-meta\.xml$', '', file_name)


def parse_generic(type_dir: str) -> dict:
    """Walk every *-meta.xml file under type_dir and extract common fields."""
    items = []
    root = Path(type_dir)
    if not root.exists():
        return {'items': items}

    for file in sorted(root.rglob('*-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        items.append({
            'apiName': _derive_api_name(file.name),
            'label': _extract_tag(xml, 'label') or _extract_tag(xml, 'masterLabel'),
            'fullName': _extract_tag(xml, 'fullName'),
            'description': _extract_tag(xml, 'description'),
        })

    return {'items': items}
