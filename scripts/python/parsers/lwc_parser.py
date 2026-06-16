"""
lwc_parser.py
Reads Salesforce Lightning Web Component metadata from SFDX source format.
Uses stdlib only (re, pathlib).
"""

import re
from pathlib import Path


def parse_lwc(lwc_dir: str) -> dict:
    """
    Parse all LWC components under lwc_dir.
    Returns {'components': [{'name', 'files', 'hasApexWire', 'hasLds'}]}
    """
    components = []
    p = Path(lwc_dir)

    if not p.exists():
        return {'components': components}

    for cmp_dir in sorted(p.iterdir()):
        if not cmp_dir.is_dir():
            continue

        files = [f.name for f in sorted(cmp_dir.iterdir())]
        has_apex_wire = False
        has_lds = False

        for f in cmp_dir.glob('*.js'):
            if f.name.endswith('.js-meta.xml'):
                continue
            body = f.read_text(encoding='utf-8')
            if re.search(r'@wire', body) and re.search(r"from\s+['\"]@salesforce/apex", body):
                has_apex_wire = True
            if re.search(r"from\s+['\"]lightning/uiRecordApi['\"]", body) or \
               re.search(r"from\s+['\"]lightning/uiObjectInfoApi['\"]", body):
                has_lds = True

        components.append({
            'name': cmp_dir.name,
            'files': files,
            'hasApexWire': has_apex_wire,
            'hasLds': has_lds,
        })

    return {'components': components}
