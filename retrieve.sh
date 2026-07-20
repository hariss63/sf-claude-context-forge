#!/usr/bin/env bash
# retrieve.sh — Retrieve Salesforce metadata into src/, then run the forge.
#
# Two paths:
#   • Org already authenticated → goes straight to retrieve
#   • Org not authenticated     → asks you to authorize first, then retrieves
#
# Usage:
#   ./retrieve.sh                  # uses orgAlias from org-config.json
#   ./retrieve.sh --alias my-org   # override the alias
#   ./retrieve.sh --skip-forge     # retrieve only, don't run forge after

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
ALIAS=""
RUN_FORGE=true

# ── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --alias)      ALIAS="$2"; shift 2 ;;
    --skip-forge) RUN_FORGE=false; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Check that sf CLI is installed ───────────────────────────────────────────
if ! command -v sf &>/dev/null; then
  echo "Salesforce CLI not found. Installing via npm..."
  npm install --global @salesforce/cli
  echo ""
fi

# ── Read alias from org-config.json if not passed on CLI ─────────────────────
if [[ -z "$ALIAS" ]] && command -v node &>/dev/null; then
  ALIAS=$(node -e "const c=require('./org-config.json'); console.log(c.orgAlias||'')" 2>/dev/null || echo "")
fi

# ── If alias is missing/placeholder, try to find an already-authenticated org ─
if [[ -z "$ALIAS" || "$ALIAS" == "my-alias" ]]; then
  # Look for a default org set via `sf config set target-org`
  DEFAULT_ORG=$(sf config get target-org --json 2>/dev/null \
    | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{try{const r=JSON.parse(d);console.log(r.result?.[0]?.value||'')}catch{console.log('')}})" 2>/dev/null || echo "")

  if [[ -n "$DEFAULT_ORG" ]]; then
    ALIAS="$DEFAULT_ORG"
    echo "Using default org: $ALIAS"
  else
    echo "No default org found. Enter the alias for your Salesforce org."
    echo "(A nickname you choose — e.g. 'my-org', 'dev-sandbox', 'production')"
    read -rp "Alias: " ALIAS
  fi
fi

# ── Check if this org is already authenticated ────────────────────────────────
echo ""
if sf org display --target-org "$ALIAS" &>/dev/null 2>&1; then
  # ── OPTION 1: Already authenticated — go straight to retrieve ────────────
  echo "✓ Org '$ALIAS' is already authenticated. Skipping login."
else
  # ── OPTION 2: Not authenticated — authorize first ────────────────────────
  echo "Org '$ALIAS' is not authenticated."
  echo ""
  echo "Opening a browser window — log in to your Salesforce org normally,"
  echo "then come back to this terminal."
  echo ""
  sf org login web --alias "$ALIAS"
  echo ""
  echo "✓ Authorization complete."
fi

echo "Retrieving metadata from '$ALIAS' into src/ ..."
echo "(This may take a minute or two depending on your org size)"
echo ""

# ── Retrieve all metadata types the forge supports ───────────────────────────
sf project retrieve start \
  --target-org "$ALIAS" \
  --metadata "CustomObject,ApexClass,ApexTrigger,Flow,LightningComponentBundle,\
PermissionSet,Profile,Layout,EmailTemplate,CustomMetadata,ConnectedApp,\
GenAiPromptTemplate,FlexiPage,ApprovalProcess,GlobalValueSet,CustomPermission,\
AssignmentRules,CustomApplication,Report,Dashboard,StaticResource,\
NamedCredential,ExternalCredential"

echo ""
echo "Retrieve complete. src/ is now populated with your org's metadata."

# ── Optionally run the forge ──────────────────────────────────────────────────
if [[ "$RUN_FORGE" == true ]]; then
  echo ""
  echo "Running the forge to generate AI skills..."
  echo ""
  if command -v node &>/dev/null; then
    node forge.js
  elif command -v python3 &>/dev/null; then
    python3 forge.py
  else
    echo "Neither node nor python3 found — run the forge manually:"
    echo "  node forge.js   OR   python3 forge.py"
  fi
fi
