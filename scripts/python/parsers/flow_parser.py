"""
flow_parser.py
Reads Salesforce Flow metadata from SFDX source format.
Uses stdlib only (re, pathlib).
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str):
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_flows(flows_dir: str) -> dict:
    """
    Parse all flows under flows_dir.
    Returns {'flows': [{'apiName', 'label', 'processType', 'triggerType', 'object', 'status', 'description'}]}
    """
    flows = []
    p = Path(flows_dir)

    if not p.exists():
        return {'flows': flows}

    for ff in sorted(p.glob('*.flow-meta.xml')):
        xml = ff.read_text(encoding='utf-8')
        name = ff.name.replace('.flow-meta.xml', '')
        flows.append({
            'apiName': name,
            'label': _extract_tag(xml, 'label'),
            'processType': _extract_tag(xml, 'processType'),
            'triggerType': _extract_tag(xml, 'triggerType'),
            'object': _extract_tag(xml, 'object'),
            'status': _extract_tag(xml, 'status'),
            'description': _extract_tag(xml, 'description'),
        })

    return {'flows': flows}
