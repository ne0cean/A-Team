#!/bin/bash
# Orchestration: Auto-trigger security audit on npm install
#
# PreToolUse hook on Bash — detects `npm install`, `npm add`, `bun add`
# and warns about security/license implications.
#
# Triggers: CSO-lite check (package reputation + known vulnerabilities)
# Does NOT block — injects advisory context.

set -uo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)

# Only trigger on package install commands
if ! echo "$CMD" | grep -qiE '^(npm install|npm add|npm i |bun add|yarn add|pnpm add)'; then
  echo '{}'
  exit 0
fi

# Extract package names (skip flags like --save-dev)
PACKAGES=$(echo "$CMD" | sed 's/^[^ ]* [^ ]*//' | tr ' ' '\n' | grep -v '^-' | grep -v '^$' | head -5)

if [ -z "$PACKAGES" ]; then
  echo '{}'
  exit 0
fi

WARNINGS=""
for PKG in $PACKAGES; do
  # Check npm registry for package info
  INFO=$(curl -s -m 3 "https://registry.npmjs.org/$PKG" 2>/dev/null)

  if [ -z "$INFO" ] || echo "$INFO" | grep -q '"error"'; then
    WARNINGS="${WARNINGS}[WARN] $PKG: not found on npm registry\n"
    continue
  fi

  # Extract key info
  LICENSE=$(echo "$INFO" | jq -r '.license // "UNKNOWN"' 2>/dev/null)
  WEEKLY=$(echo "$INFO" | jq -r '.["dist-tags"].latest' 2>/dev/null)
  MAINTAINERS=$(echo "$INFO" | jq -r '.maintainers | length' 2>/dev/null)
  LATEST_VER=$(echo "$INFO" | jq -r '.["dist-tags"].latest // "?"' 2>/dev/null)

  # Flag GPL/AGPL (copyleft risk)
  if echo "$LICENSE" | grep -qiE 'GPL|AGPL|SSPL'; then
    WARNINGS="${WARNINGS}[SECURITY] $PKG: Copyleft license ($LICENSE) — may infect your codebase\n"
  fi

  # Flag unknown/missing license
  if [ "$LICENSE" = "UNKNOWN" ] || [ "$LICENSE" = "null" ]; then
    WARNINGS="${WARNINGS}[WARN] $PKG: No license specified — legal risk\n"
  fi

  # Flag low maintainer count
  if [ "$MAINTAINERS" = "1" ] || [ "$MAINTAINERS" = "0" ]; then
    WARNINGS="${WARNINGS}[INFO] $PKG: Single maintainer — supply chain risk\n"
  fi

  WARNINGS="${WARNINGS}[OK] $PKG@$LATEST_VER (license: $LICENSE, maintainers: $MAINTAINERS)\n"
done

if [ -n "$WARNINGS" ]; then
  ADVISORY=$(echo -e "$WARNINGS")
  jq -n --arg ctx "Package Security Advisory (auto-triggered):\n$ADVISORY\nRun \`npm audit\` after install. For GPL packages, consult /cso before proceeding." \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$ctx}}'
else
  echo '{}'
fi
