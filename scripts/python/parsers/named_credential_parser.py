"""Parser for Named Credential metadata (.namedCredential-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_named_credentials(type_dir: str) -> dict:
    """
    @param type_dir: path to the namedCredentials/ folder
    @returns: { credentials: list }
    """
    credentials = []
    p = Path(type_dir)
    if not p.exists():
        return {'credentials': credentials}

    for f in sorted(p.glob('*.namedCredential-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        credentials.append({
            'apiName':       f.name.replace('.namedCredential-meta.xml', ''),
            'label':         _extract_tag(xml, 'label'),
            'endpoint':      _extract_tag(xml, 'endpoint'),
            'principalType': _extract_tag(xml, 'principalType'),
            'protocol':      _extract_tag(xml, 'protocol'),
        })

    return {'credentials': credentials}
