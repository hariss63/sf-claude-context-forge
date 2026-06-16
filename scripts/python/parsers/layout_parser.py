"""
layout_parser.py
Reads Salesforce Page Layout metadata from SFDX source format.
Uses stdlib only (pathlib).
"""

from pathlib import Path


def parse_layouts(layout_dir: str) -> dict:
    """
    Parse all layouts under layout_dir.
    Returns {'layouts': [{'name'}]}
    """
    layouts = []
    p = Path(layout_dir)

    if not p.exists():
        return {'layouts': layouts}

    for ff in sorted(p.glob('*.layout-meta.xml')):
        name = ff.name.replace('.layout-meta.xml', '')
        layouts.append({'name': name})

    return {'layouts': layouts}
