"""Parser for Static Resource metadata (.resource-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_static_resources(type_dir: str) -> dict:
    """
    @param type_dir: path to the staticresources/ folder
    @returns: { resources: list }
    """
    resources = []
    p = Path(type_dir)
    if not p.exists():
        return {'resources': resources}

    for f in sorted(p.glob('*.resource-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        resources.append({
            'apiName':      f.name.replace('.resource-meta.xml', ''),
            'contentType':  _extract_tag(xml, 'contentType'),
            'cacheControl': _extract_tag(xml, 'cacheControl'),
        })

    return {'resources': resources}
