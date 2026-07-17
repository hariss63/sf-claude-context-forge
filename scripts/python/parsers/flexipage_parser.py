"""
flexipage_parser.py
Reads Salesforce FlexiPage (Lightning App Builder) metadata from SFDX source format.
Parses .flexipage-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_flexipages(type_dir: str) -> dict:
    """Parse all *.flexipage-meta.xml files in a flexipages/ folder."""
    pages = []
    root = Path(type_dir)
    if not root.exists():
        return {'pages': pages}

    for file in sorted(root.glob('*.flexipage-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        pages.append({
            'apiName': file.name.replace('.flexipage-meta.xml', ''),
            'masterLabel': _extract_tag(xml, 'masterLabel'),
            'type': _extract_tag(xml, 'type'),
            'sobjectType': _extract_tag(xml, 'sobjectType'),
        })

    return {'pages': pages}
