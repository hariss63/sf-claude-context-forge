"""
gen_ai_prompt_template_parser.py
Reads Salesforce GenAI Prompt Template (Prompt Builder) metadata from SFDX source format.
Parses .genAiPromptTemplate-meta.xml files.
"""

import re
from pathlib import Path


def _extract_tag(xml: str, tag: str) -> str | None:
    m = re.search(rf'<{tag}[^>]*>([\s\S]*?)</{tag}>', xml)
    return m.group(1).strip() if m else None


def parse_gen_ai_prompt_templates(type_dir: str) -> dict:
    """Parse all *.genAiPromptTemplate-meta.xml files in a genAiPromptTemplates/ folder."""
    templates = []
    root = Path(type_dir)
    if not root.exists():
        return {'templates': templates}

    for file in sorted(root.glob('*.genAiPromptTemplate-meta.xml')):
        xml = file.read_text(encoding='utf-8')
        templates.append({
            'apiName': file.name.replace('.genAiPromptTemplate-meta.xml', ''),
            'masterLabel': _extract_tag(xml, 'masterLabel'),
            'templateType': _extract_tag(xml, 'templateType'),
            'description': _extract_tag(xml, 'description'),
            'content': _extract_tag(xml, 'content'),
        })

    return {'templates': templates}
