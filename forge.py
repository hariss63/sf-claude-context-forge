#!/usr/bin/env python3
"""
sf-claude-context-forge — Python entry point
Orchestrates parsing of SF metadata and generation of Claude Agent Skills.
"""

import re
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts" / "python"))

from parsers.object_parser                 import parse_objects
from parsers.flow_parser                   import parse_flows
from parsers.apex_parser                   import parse_apex
from parsers.lwc_parser                    import parse_lwc
from parsers.permset_parser                import parse_permsets
from parsers.profile_parser                import parse_profiles
from parsers.layout_parser                 import parse_layouts
from parsers.template_parser               import parse_templates
from parsers.custom_metadata_parser        import parse_custom_metadata
from parsers.connected_app_parser          import parse_connected_apps
from parsers.gen_ai_prompt_template_parser import parse_gen_ai_prompt_templates
from parsers.flexipage_parser              import parse_flexipages
from parsers.approval_process_parser       import parse_approval_processes
from parsers.generic_parser                import parse_generic
from generator import generate_skill, generate_reference, is_skill_type, skill_name_for

IS_DRY   = "--dry-run" in sys.argv
USE_DEMO = "--demo"    in sys.argv

config = json.loads(Path("org-config.json").read_text())

PARSERS = {
    "objects":              (parse_objects,               "Custom objects & fields"),
    "flows":                (parse_flows,                 "Flows & automations"),
    "classes":              (parse_apex,                  "Apex classes"),
    "triggers":             (parse_apex,                  "Apex triggers"),
    "lwc":                  (parse_lwc,                   "LWC components"),
    "permissionsets":       (parse_permsets,               "Permission sets"),
    "profiles":              (parse_profiles,               "Profiles"),
    "layouts":               (parse_layouts,                "Page layouts"),
    "emailTemplates":        (parse_templates,              "Email templates"),
    "customMetadata":        (parse_custom_metadata,        "Custom Metadata"),
    "connectedApps":         (parse_connected_apps,         "Connected Apps"),
    "genAiPromptTemplates":  (parse_gen_ai_prompt_templates, "Prompt templates"),
    "flexipages":            (parse_flexipages,             "FlexiPages"),
    "approvalProcesses":     (parse_approval_processes,     "Approval Processes"),
}


def kebab(name: str) -> str:
    return re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '-', name).lower()


def resolve_src(config: dict, force_demo: bool) -> Path:
    src  = Path(config["srcDir"])
    demo = Path(config.get("demoDir", "demo-metadata"))
    if force_demo:
        return demo
    if not src.exists():
        return demo
    entries = [f for f in src.iterdir() if not f.name.startswith(".")]
    if not entries and config.get("useDemoIfSrcEmpty", True):
        return demo
    return src


def main():
    src_dir = resolve_src(config, USE_DEMO)
    ref_dir = Path(config["outputDir"]) / "reference"

    print(f"\n📂 Source: {src_dir}")
    print(f"📁 Skills: .claude/skills/  |  Reference: {ref_dir}\n")

    skill_count = 0
    reference_count = 0
    handled = set()
    # Some metadata types share one skill (classes + triggers -> salesforce-apex).
    # Parse everything first and merge array fields per skill before writing once,
    # so the second type parsed never silently overwrites the first's SKILL.md.
    skill_groups = {}  # skillName -> {'representativeType': str, 'parsed': dict}

    for mtype, (parser_fn, label) in PARSERS.items():
        if mtype not in config["metadataTypes"]:
            continue
        handled.add(mtype)

        type_dir = src_dir / mtype
        if not type_dir.exists():
            print(f"⚠  Skipping {mtype} — folder not found in {src_dir}")
            continue

        print(f"⚙  Parsing {label}...")
        try:
            parsed = parser_fn(str(type_dir))

            if is_skill_type(mtype):
                skill_name = skill_name_for(mtype)
                group = skill_groups.setdefault(skill_name, {'representativeType': mtype, 'parsed': {}})
                for key, value in parsed.items():
                    if not isinstance(value, list):
                        continue
                    group['parsed'].setdefault(key, [])
                    group['parsed'][key].extend(value)
        except Exception as e:
            print(f"   ✗ Error parsing {mtype}: {e}")

    for skill_name, group in skill_groups.items():
        result = generate_skill(group['representativeType'], group['parsed'], config)
        skill_dir = Path(".claude") / "skills" / skill_name
        ref_slug = re.sub(r'^salesforce-', '', skill_name)
        ref_path = skill_dir / "references" / f"{ref_slug}-reference.md"

        if not IS_DRY:
            skill_dir.mkdir(parents=True, exist_ok=True)
            ref_path.parent.mkdir(parents=True, exist_ok=True)
            (skill_dir / "SKILL.md").write_text(result['skillMd'], encoding="utf-8")
            ref_path.write_text(result['referenceMd'], encoding="utf-8")
            print(f"   ✓ {skill_dir / 'SKILL.md'}")
            skill_count += 1
        else:
            print(f"   [dry-run] would write → {skill_dir}/SKILL.md")

    # Auto-detect any remaining src/ subdirectories not covered by a dedicated parser.
    if src_dir.exists():
        for type_dir in sorted(p for p in src_dir.iterdir() if p.is_dir() and p.name not in handled):
            mtype = type_dir.name
            print(f"⚙  Parsing {mtype} (generic)...")
            try:
                parsed = parse_generic(str(type_dir))
                if not parsed["items"]:
                    continue

                reference_md = generate_reference(mtype, parsed, config)
                out_path = ref_dir / f"{kebab(mtype)}.md"

                if not IS_DRY:
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_text(reference_md, encoding="utf-8")
                    print(f"   ✓ {out_path}")
                    reference_count += 1
                else:
                    print(f"   [dry-run] would write → {out_path}")
            except Exception as e:
                print(f"   ✗ Error parsing {mtype}: {e}")

    print(f"\n✅ Done — {skill_count} skill(s), {reference_count} reference doc(s) generated.\n")


if __name__ == "__main__":
    main()
