"""
apex_parser.py
Reads Salesforce Apex class and trigger metadata from SFDX source format.
Uses stdlib only (re, pathlib).
"""

import re
from pathlib import Path


def parse_apex(apex_dir: str) -> dict:
    """
    Parse all Apex classes and triggers under apex_dir.
    Returns {'classes': [...], 'triggers': [...]}
    """
    classes = []
    triggers = []
    p = Path(apex_dir)

    if not p.exists():
        return {'classes': classes, 'triggers': triggers}

    for f in sorted(p.iterdir()):
        if f.suffix == '.cls':
            body = f.read_text(encoding='utf-8')
            name = f.stem
            is_test = bool(re.search(r'@isTest', body, re.IGNORECASE))
            sharing_m = re.search(r'\b(with|without|inherited)\s+sharing\b', body, re.IGNORECASE)
            sharing = sharing_m.group(0) if sharing_m else None
            classes.append({
                'name': name,
                'isTest': is_test,
                'sharing': sharing,
                'lines': len(body.splitlines()),
            })

        elif f.suffix == '.trigger':
            body = f.read_text(encoding='utf-8')
            name = f.stem
            obj_m = re.search(r'trigger\s+\w+\s+on\s+(\w+)', body, re.IGNORECASE)
            evt_m = re.search(r'on\s+\w+\s*\(([^)]+)\)', body, re.IGNORECASE)
            obj = obj_m.group(1) if obj_m else None
            events = [e.strip() for e in evt_m.group(1).split(',')] if evt_m else []
            triggers.append({
                'name': name,
                'object': obj,
                'events': events,
                'lines': len(body.splitlines()),
            })

    return {'classes': classes, 'triggers': triggers}
