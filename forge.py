#!/usr/bin/env python3
"""
sf-claude-context-forge — Python entry point
Orchestrates parsing of SF metadata and generation of Claude skill files.
"""

import sys
import os
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "scripts" / "python"))

from parsers.object_parser   import parse_objects
from parsers.flow_parser     import parse_flows
from parsers.apex_parser     import parse_apex
from parsers.lwc_parser      import parse_lwc
from parsers.permset_parser  import parse_permsets
from parsers.profile_parser  import parse_profiles
from parsers.layout_parser   import parse_layouts
from parsers.template_parser import parse_templates
from generator               import generate_skill

IS_DRY   = "--dry-run" in sys.argv
USE_DEMO = "--demo"    in sys.argv

config = json.loads(Path("org-config.json").read_text())

PARSERS = {
    "objects":        (parse_objects,   "objects",   "Custom objects & fields"),
    "flows":          (parse_flows,     "flows",     "Flows & automations"),
    "classes":        (parse_apex,      "apex",      "Apex classes"),
    "triggers":       (parse_apex,      "apex",      "Apex triggers"),
    "lwc":            (parse_lwc,       "lwc",       "LWC components"),
    "permissionsets": (parse_permsets,  "perms",     "Permission sets"),
    "profiles":       (parse_profiles,  "profiles",  "Profiles"),
    "layouts":        (parse_layouts,   "layouts",   "Page layouts"),
    "emailTemplates": (parse_templates, "templates", "Email templates"),
}


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
    out_dir = Path(config["outputDir"])

    print(f"\n📂 Source: {src_dir}")
    print(f"📁 Output: {out_dir}\n")

    total = 0

    for mtype in config["metadataTypes"]:
        if mtype not in PARSERS:
            continue

        parser_fn, out_sub, label = PARSERS[mtype]
        type_dir = src_dir / mtype

        if not type_dir.exists():
            print(f"⚠  Skipping {mtype} — folder not found in {src_dir}")
            continue

        print(f"⚙  Parsing {label}...")
        try:
            parsed   = parser_fn(str(type_dir))
            out_path = out_dir / out_sub / f"{mtype}.md"

            if not IS_DRY:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                skill = generate_skill(mtype, parsed, config)
                out_path.write_text(skill, encoding="utf-8")
                print(f"   ✓ {out_path}")
                total += 1
            else:
                print(f"   [dry-run] would write → {out_path}")
        except Exception as e:
            print(f"   ✗ Error parsing {mtype}: {e}")

    print(f"\n✅ Done — {total} skill file(s) generated.\n")


if __name__ == "__main__":
    main()
