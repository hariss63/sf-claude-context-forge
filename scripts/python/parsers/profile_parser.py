"""
profile_parser.py
Reads Salesforce Profile metadata from SFDX source format.
Uses stdlib only (pathlib).
"""

from pathlib import Path


def parse_profiles(profile_dir: str) -> dict:
    """
    Parse all profiles under profile_dir.
    Returns {'profiles': [{'name'}]}
    """
    profiles = []
    p = Path(profile_dir)

    if not p.exists():
        return {'profiles': profiles}

    for ff in sorted(p.glob('*.profile-meta.xml')):
        name = ff.name.replace('.profile-meta.xml', '')
        profiles.append({'name': name})

    return {'profiles': profiles}
