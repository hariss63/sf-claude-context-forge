"""Parser for Custom App (Lightning App) metadata (.app-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_applications(type_dir: str) -> dict:
    """
    @param type_dir: path to the applications/ folder
    @returns: { apps: list }
    """
    apps = []
    p = Path(type_dir)
    if not p.exists():
        return {'apps': apps}

    for f in sorted(p.glob('*.app-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        apps.append({
            'apiName':     f.name.replace('.app-meta.xml', ''),
            'label':       _extract_tag(xml, 'label'),
            'description': _extract_tag(xml, 'description'),
            'navType':     _extract_tag(xml, 'navType') or 'Standard',
        })

    return {'apps': apps}
