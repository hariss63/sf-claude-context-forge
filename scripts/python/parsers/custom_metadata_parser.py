"""
custom_metadata_parser.py
Reads Salesforce Custom Metadata Type records from SFDX source format.
Parses .md-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _extract_all_blocks(xml: str, tag: str) -> list[str]:
    return re.findall(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)


def parse_custom_metadata(type_dir: str) -> dict:
    """Parse all *.md-meta.xml files in a customMetadata/ folder."""
    records = []
    root = Path(type_dir)
    if not root.exists():
        return {'records': records}

    for file in sorted(root.glob('*.md-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        full_name = file.name.replace('.md-meta.xml', '')
        type_name, _, record_name = full_name.partition('.')

        fields = [
            {'field': _extract_tag(block, 'field'), 'value': _extract_tag(block, 'value')}
            for block in _extract_all_blocks(xml, 'values')
        ]

        records.append({
            'fullName': full_name,
            'typeName': type_name,
            'recordName': record_name,
            'label': _extract_tag(xml, 'label'),
            'protected': _extract_tag(xml, 'protected') == 'true',
            'fields': fields,
        })

    return {'records': records}
