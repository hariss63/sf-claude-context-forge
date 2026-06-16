# Skill: Running the forge

## When to use this skill
Load this skill when the developer asks to run the forge, regenerate skills, or wants to understand how to use this tool.

## How to run the forge

### Universal (auto-detects runtime)
```bash
./forge.sh
```

### Node.js
```bash
npm install
npm run forge
```

### Python
```bash
pip install -r requirements.txt
python forge.py
```

### With demo metadata (no src/ needed)
```bash
./forge.sh --demo
```

### Dry run (preview without writing files)
```bash
./forge.sh --dry-run
```

### Push to Claude Code after review
```bash
./forge.sh --push
```

## What the forge produces
After running, `generated/` will contain one Markdown skill file per metadata type found in `src/`. Each file teaches Claude:
- The naming conventions used in this org
- The metadata patterns and structures in use
- Design rules for creating new metadata of that type

## Troubleshooting
- **src/ is empty** → forge automatically uses `demo-metadata/` if `useDemoIfSrcEmpty` is true in `org-config.json`
- **Missing metadata type** → check that the folder exists in `src/` (e.g. `src/flows/`)
- **Node not found** → forge.sh falls back to Python automatically
- **Permission denied on forge.sh** → run `chmod +x forge.sh`

## After forging
Review files in `generated/`, then either:
1. Keep them there — Claude Code will read them from the project
2. Run `./forge.sh --push` to copy them to `~/.claude/skills/sf-forge/`
