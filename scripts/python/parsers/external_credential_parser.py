"""Parser for External Credential metadata (.externalCredential-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_external_credentials(type_dir: str) -> dict:
    """
    @param type_dir: path to the externalCredentials/ folder
    @returns: { credentials: list }
    """
    credentials = []
    p = Path(type_dir)
    if not p.exists():
        return {'credentials': credentials}

    for f in sorted(p.glob('*.externalCredential-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        credentials.append({
            'apiName':                f.name.replace('.externalCredential-meta.xml', ''),
            'label':                  _extract_tag(xml, 'label'),
            'description':            _extract_tag(xml, 'description'),
            'authenticationProtocol': _extract_tag(xml, 'authenticationProtocol'),
        })

    return {'credentials': credentials}
