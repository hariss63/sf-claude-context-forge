"""
approval_process_parser.py
Reads Salesforce Approval Process metadata from SFDX source format.
Parses .approvalProcess-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_approval_processes(type_dir: str) -> dict:
    """Parse all *.approvalProcess-meta.xml files in an approvalProcesses/ folder."""
    processes = []
    root = Path(type_dir)
    if not root.exists():
        return {'processes': processes}

    for file in sorted(root.glob('*.approvalProcess-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        full_name = file.name.replace('.approvalProcess-meta.xml', '')
        entity = full_name.split('.')[0]

        processes.append({
            'fullName': full_name,
            'entity': entity,
            'label': _extract_tag(xml, 'label'),
            'active': _extract_tag(xml, 'active') == 'true',
            'description': _extract_tag(xml, 'description'),
        })

    return {'processes': processes}
