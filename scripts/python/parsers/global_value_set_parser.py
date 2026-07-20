"""Parser for Global Value Set metadata (.globalValueSet-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _extract_all_blocks(xml: str, tag: str) -> list[str]:
    return re.findall(rf'<{tag}[^>]*>[\s\S]*?</{tag}>', xml)


def parse_global_value_sets(type_dir: str) -> dict:
    """
    @param type_dir: path to the globalValueSets/ folder
    @returns: { valueSets: list }
    """
    value_sets = []
    p = Path(type_dir)
    if not p.exists():
        return {'valueSets': value_sets}

    for f in sorted(p.glob('*.globalValueSet-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        api_name = f.name.replace('.globalValueSet-meta.xml', '')

        blocks = _extract_all_blocks(xml, 'customValue')
        values = [
            {
                'value':     _extract_tag(b, 'fullName'),
                'label':     _extract_tag(b, 'label'),
                'isDefault': _extract_tag(b, 'default') == 'true',
                'isActive':  _extract_tag(b, 'isActive') != 'false',
            }
            for b in blocks
        ]

        value_sets.append({
            'apiName':     api_name,
            'masterLabel': _extract_tag(xml, 'masterLabel') or api_name,
            'sorted':      _extract_tag(xml, 'sorted') == 'true',
            'values':      values,
        })

    return {'valueSets': value_sets}
