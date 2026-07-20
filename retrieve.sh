#!/usr/bin/env bash
# retrieve.sh — Log in to your Salesforce org, pull metadata into src/, then run the forge.
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
    --alias)   ALIAS="$2"; shift 2 ;;
    --skip-forge) RUN_FORGE=false; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Read alias from org-config.json if not passed ────────────────────────────
if [[ -z "$ALIAS" ]]; then
  if command -v node &>/dev/null; then
    ALIAS=$(node -e "const c=require('./org-config.json'); console.log(c.orgAlias||'')" 2>/dev/null || echo "")
  fi
fi

# ── Check that sf CLI is installed ───────────────────────────────────────────
if ! command -v sf &>/dev/null; then
  echo "Salesforce CLI not found."
  echo "Installing via npm..."
  npm install --global @salesforce/cli
  echo ""
fi

# ── Ask for alias if still empty or still the placeholder ────────────────────
if [[ -z "$ALIAS" || "$ALIAS" == "my-alias" ]]; then
  echo "What alias did you use when you logged into your Salesforce org?"
  echo "(This is the nickname from: sf org login web --alias <nickname>)"
  read -rp "Alias: " ALIAS
fi

# ── Log in if the org isn't already authenticated ────────────────────────────
if ! sf org display --target-org "$ALIAS" &>/dev/null 2>&1; then
  echo ""
  echo "No authenticated session found for '$ALIAS'."
  echo "Opening browser to log in — sign in normally, then come back here."
  echo ""
  sf org login web --alias "$ALIAS"
  echo ""
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
