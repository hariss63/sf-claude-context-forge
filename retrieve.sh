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

# ── Verify the alias actually exists in sf org list; if not, auto-detect ──────
ORG_LIST=$(sf org list --json 2>/dev/null || echo "{}")

_alias_is_authenticated() {
  local a="$1"
  echo "$ORG_LIST" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try {
        const r=JSON.parse(d);
        const all=[...(r.result?.nonScratchOrgs||[]),...(r.result?.scratchOrgs||[])];
        console.log(all.some(o=>o.alias==='$a'||o.username==='$a')?'yes':'no');
      } catch(e){ console.log('no'); }
    });
  " 2>/dev/null || echo "no"
}

if [[ -n "$ALIAS" ]] && [[ "$(_alias_is_authenticated "$ALIAS")" != "yes" ]]; then
  echo "Note: org alias '$ALIAS' (from org-config.json) is not in your authenticated orgs."
  ALIAS=""  # fall through to auto-detect below
fi

# ── If alias is missing or not authenticated, detect from sf org list ─────────
if [[ -z "$ALIAS" ]]; then
  # Try: org explicitly marked as default username
  DEFAULT_ORG=$(echo "$ORG_LIST" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try {
        const r=JSON.parse(d);
        const all=[...(r.result?.nonScratchOrgs||[]),...(r.result?.scratchOrgs||[])];
        const def=all.find(o=>o.isDefaultUsername||o.isDefaultDevHubUsername);
        console.log(def?.alias||def?.username||'');
      } catch(e){ console.log(''); }
    });
  " 2>/dev/null || echo "")

  if [[ -n "$DEFAULT_ORG" ]]; then
    ALIAS="$DEFAULT_ORG"
    echo "Found default org: $ALIAS"
  else
    # No default — show what's available and ask
    echo "Authenticated orgs:"
    echo "$ORG_LIST" | node -e "
      let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
        try {
          const r=JSON.parse(d);
          const all=[...(r.result?.nonScratchOrgs||[]),...(r.result?.scratchOrgs||[])];
          if(all.length===0){ console.log('  (none — you need to run: sf org login web --alias <name>)'); return; }
          all.forEach((o,i)=>console.log('  '+(i+1)+'. '+(o.alias||o.username)));
        } catch(e){ console.log('  (unable to list)'); }
      });
    " 2>/dev/null || true
    echo ""
    read -rp "Enter the alias to use: " ALIAS
  fi
fi

# ── At this point ALIAS is confirmed authenticated ────────────────────────────
echo ""
echo "✓ Org '$ALIAS' is ready."

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
