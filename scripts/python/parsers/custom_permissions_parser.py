"""Parser for Custom Permission metadata (.customPermission-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_custom_permissions(type_dir: str) -> dict:
    """
    @param type_dir: path to the customPermissions/ folder
    @returns: { permissions: list }
    """
    permissions = []
    p = Path(type_dir)
    if not p.exists():
        return {'permissions': permissions}

    for f in sorted(p.glob('*.customPermission-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        permissions.append({
            'apiName':            f.name.replace('.customPermission-meta.xml', ''),
            'label':              _extract_tag(xml, 'label'),
            'description':        _extract_tag(xml, 'description'),
            'isSessionActivated': _extract_tag(xml, 'isSessionActivated') == 'true',
        })

    return {'permissions': permissions}
