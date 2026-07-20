"""Parser for Report metadata (.report-meta.xml), nested in folder hierarchy."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_reports(type_dir: str) -> dict:
    """
    @param type_dir: path to the reports/ folder (reports are nested in sub-folders)
    @returns: { reports: list }
    """
    reports = []
    p = Path(type_dir)
    if not p.exists():
        return {'reports': reports}

    for f in sorted(p.rglob('*.report-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        reports.append({
            'name':        f.name.replace('.report-meta.xml', ''),
            'reportType':  _extract_tag(xml, 'reportType'),
            'format':      _extract_tag(xml, 'format'),
            'description': _extract_tag(xml, 'description'),
        })

    return {'reports': reports}
