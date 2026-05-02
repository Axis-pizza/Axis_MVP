#!/usr/bin/env bash
# DB 分割の整合性チェック: axis-db（旧） vs axis-db-core（新）
# 使い方: bash scripts/verify-db-split.sh

set -euo pipefail

TABLES=(users strategies vaults invites watchlist investments invite_codes xp_ledger xp_rates xp_snapshots strategy_deployment_baseline)

COL_W=32
OLD_W=14
NEW_W=18

hr() { printf '+%s+%s+%s+%s+\n' "$(printf '%*s' $((COL_W+2)) '' | tr ' ' '-')" \
  "$(printf '%*s' $((OLD_W+2)) '' | tr ' ' '-')" \
  "$(printf '%*s' $((NEW_W+2)) '' | tr ' ' '-')" \
  "--------"; }

header() {
  hr
  printf '| %-*s | %-*s | %-*s | %s |\n' $COL_W "テーブル" $OLD_W "axis-db（旧）" $NEW_W "axis-db-core（新）" "結果"
  hr
}

count() {
  local DB=$1 TABLE=$2
  bunx wrangler d1 execute "$DB" \
    --command "SELECT COUNT(*) as cnt FROM $TABLE" \
    --remote 2>/dev/null \
    | grep '"cnt"' | grep -o '[0-9]*'
}

PASS=0
FAIL=0

header
for TABLE in "${TABLES[@]}"; do
  OLD=$(count axis-db "$TABLE")
  NEW=$(count axis-db-core "$TABLE")
  if [ "$OLD" = "$NEW" ]; then
    ICON="✅"; ((PASS++)) || true
  else
    ICON="❌ MISMATCH"; ((FAIL++)) || true
  fi
  printf '| %-*s | %-*s | %-*s | %s |\n' $COL_W "$TABLE" $OLD_W "$OLD" $NEW_W "$NEW" "$ICON"
done
hr

echo ""
echo "analytics テーブル確認:"
bunx wrangler d1 execute axis-db-analytics \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'" \
  --remote 2>/dev/null \
  | grep -o '"name": "[a-z_]*"' | grep -o '"[a-z_]*"$' | tr -d '"' | while read t; do
    printf '  %-40s schema only\n' "$t"
  done

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "結果: 全 $PASS テーブル一致 ✅"
else
  echo "結果: $PASS 一致 / $FAIL 不一致 ❌"
  exit 1
fi
