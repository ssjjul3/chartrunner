#!/usr/bin/env bash
# verify-phase1-assumptions.sh
#
# Validates the 5 assumptions from ChartRunner_Phase1_SDK_Architecture.md
# §"Verification checklist for this doc" against the actual trading-stack
# repo. Run this BEFORE starting Phase 1 M1 (SDK extraction) — if any check
# fails, the architecture doc needs updating before code lands.
#
# Usage:
#   ./scripts/verify-phase1-assumptions.sh
#   ./scripts/verify-phase1-assumptions.sh /path/to/trading-stack
#
# Exit codes:
#   0  — all 5 assumptions hold
#   1+ — one or more failed; see report

set -uo pipefail

STACK="${1:-$HOME/trading-stack}"
PASS=0; FAIL=0
REPORT=()

note(){ printf "  %s\n" "$*"; }
ok(){   printf "  \033[32m✓\033[0m %s\n" "$*"; PASS=$((PASS+1)); REPORT+=("OK   $*"); }
bad(){  printf "  \033[31m✗\033[0m %s\n" "$*"; FAIL=$((FAIL+1)); REPORT+=("FAIL $*"); }
hdr(){  printf "\n\033[1m%s\033[0m\n" "$*"; }

if [[ ! -d "$STACK" ]]; then
  printf "\033[31mtrading-stack not found at %s\033[0m\n" "$STACK"
  printf "Pass the correct path as the first argument.\n"
  exit 2
fi

printf "\033[1mPhase 1 verification — trading-stack at %s\033[0m\n" "$STACK"

# ─── 1. File existence ───────────────────────────────────────────────────
hdr "1. Required Python files exist"
declare -a REQUIRED_FILES=(
  "hl/api.py"
  "hl/signal_engine.py"
  "hl/gate_logic.py"
  "hl/trade_executor.py"
  "hl/position_manager.py"
  "shared/signal_bus.py"
  "shared/intelligence.py"
  "shared/state.py"
  "guardian.py"
)
for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$STACK/$f" ]]; then ok "$f"; else bad "missing: $f"; fi
done

# ─── 2. signal_bus.emit_signal signature ────────────────────────────────
hdr "2. shared/signal_bus.py::emit_signal signature"
SIG_FILE="$STACK/shared/signal_bus.py"
if [[ -f "$SIG_FILE" ]]; then
  if grep -qE 'def\s+emit_signal\s*\(' "$SIG_FILE"; then
    ok "emit_signal defined"
    # The architecture doc calls emit_signal(source="chartrunner", direction="LONG",
    # confidence=0.72, coin="BTC", reason="...", metadata={...}). Probe for each kwarg.
    PARAMS=$(grep -A 20 'def\s\+emit_signal' "$SIG_FILE" | head -30)
    for kw in source direction confidence coin reason metadata; do
      if printf "%s" "$PARAMS" | grep -qE "\\b${kw}\\b"; then
        ok "  param: $kw"
      else
        bad "  param missing: $kw"
      fi
    done
  else
    bad "emit_signal not defined in $SIG_FILE"
  fi
else
  bad "signal_bus.py not found"
fi

# ─── 3. hl/api.py exports the 6 async functions ─────────────────────────
hdr "3. hl/api.py — 6 expected async functions"
API_FILE="$STACK/hl/api.py"
if [[ -f "$API_FILE" ]]; then
  declare -a REQUIRED_FNS=(place_order close_order get_all_assets get_price fetch_open_positions get_account_equity)
  for fn in "${REQUIRED_FNS[@]}"; do
    if grep -qE "^(async\s+)?def\s+${fn}\b" "$API_FILE"; then
      ok "$fn"
    else
      bad "missing: $fn"
    fi
  done
else
  bad "hl/api.py not found"
fi

# ─── 4. state.json bot_signals shape ────────────────────────────────────
hdr "4. state.json[\"bot_signals\"] schema"
STATE_FILE="$STACK/state.json"
if [[ -f "$STATE_FILE" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$STATE_FILE" <<'PY' && ok "state.json shape OK" || bad "state.json schema mismatch"
import json, sys
p = sys.argv[1]
try:
    d = json.load(open(p))
except Exception as e:
    print(f"could not parse state.json: {e}", file=sys.stderr); sys.exit(1)
sigs = d.get("bot_signals")
if sigs is None:
    print("bot_signals key missing", file=sys.stderr); sys.exit(1)
if not isinstance(sigs, (list, dict)):
    print(f"bot_signals is {type(sigs).__name__}, expected list or dict", file=sys.stderr); sys.exit(1)
# Probe one entry if list
if isinstance(sigs, list) and sigs:
    s0 = sigs[0]
    needed = {"source","direction","confidence","coin","reason"}
    missing = needed - set(s0.keys()) if isinstance(s0, dict) else needed
    if missing:
        print(f"first entry missing keys: {missing}", file=sys.stderr); sys.exit(1)
print("OK")
PY
  else
    bad "python3 not available — can't validate state.json"
  fi
else
  note "state.json not present (system may not have booted yet) — non-blocking"
  REPORT+=("WARN state.json absent (not necessarily a Phase 1 blocker)")
fi

# ─── 5. guardian / systemd long-running WebSocket ───────────────────────
hdr "5. guardian.py supports long-running WebSocket service"
GUARD="$STACK/guardian.py"
if [[ -f "$GUARD" ]]; then
  ok "guardian.py exists"
  if grep -qE 'Restart\s*=\s*always|RestartSec' "$GUARD"; then
    ok "Restart policy detected"
  else
    note "no explicit Restart=always — may need sdk/keepalive.py ping endpoint"
    REPORT+=("WARN guardian.py: no Restart=always policy — see Phase 1 doc §verification item 5")
  fi
else
  bad "guardian.py not found"
fi

# Look for any *.service / *.timer to gauge the existing systemd pattern
SVCS=$(find "$STACK" -maxdepth 2 -name "*.service" -o -name "*.timer" 2>/dev/null | head -5)
if [[ -n "$SVCS" ]]; then
  hdr "  Existing systemd units (for comparison when adding sdk.service)"
  echo "$SVCS" | sed 's|^|  |'
fi

# ─── Summary ─────────────────────────────────────────────────────────────
hdr "Summary"
printf "  passed: %d\n" "$PASS"
printf "  failed: %d\n" "$FAIL"
echo
printf "%s\n" "${REPORT[@]}"

if [[ $FAIL -eq 0 ]]; then
  printf "\n\033[32mAll Phase 1 assumptions hold — clear to start M1.\033[0m\n"
  exit 0
else
  printf "\n\033[31m%d assumption(s) need attention before M1.\033[0m\n" "$FAIL"
  printf "Update ChartRunner_Phase1_SDK_Architecture.md or fix the stack before extraction.\n"
  exit 1
fi
