"""Parser for Assignment Rules metadata (.assignmentRules-meta.xml)."""
import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def _extract_all_blocks(xml: str, tag: str) -> list[str]:
    return re.findall(rf'<{tag}[^>]*>[\s\S]*?</{tag}>', xml)


def parse_assignment_rules(type_dir: str) -> dict:
    """
    @param type_dir: path to the assignmentRules/ folder
    @returns: { rulesets: list }
    """
    rulesets = []
    p = Path(type_dir)
    if not p.exists():
        return {'rulesets': rulesets}

    for f in sorted(p.glob('*.assignmentRules-meta.xml')):
        xml = f.read_text(encoding='utf-8')
        obj = f.name.replace('.assignmentRules-meta.xml', '')
        blocks = _extract_all_blocks(xml, 'assignmentRule')

        rules = [
            {
                'name':   _extract_tag(b, 'fullName'),
                'active': _extract_tag(b, 'active') == 'true',
            }
            for b in blocks
        ]

        rulesets.append({
            'object':      obj,
            'activeRules': sum(1 for r in rules if r['active']),
            'totalRules':  len(rules),
            'rules':       rules,
        })

    return {'rulesets': rulesets}
