"""Parser for Dashboard metadata (.dashboard-meta.xml), nested in folder hierarchy."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_dashboards(type_dir: str) -> dict:
    """
    @param type_dir: path to the dashboards/ folder (dashboards are nested in sub-folders)
    @returns: { dashboards: list }
    """
    dashboards = []
    p = Path(type_dir)
    if not p.exists():
        return {'dashboards': dashboards}

    for f in sorted(p.rglob('*.dashboard-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        dashboards.append({
            'name':        f.name.replace('.dashboard-meta.xml', ''),
            'title':       _extract_tag(xml, 'title'),
            'description': _extract_tag(xml, 'description'),
        })

    return {'dashboards': dashboards}
