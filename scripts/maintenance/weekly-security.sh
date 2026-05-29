#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "🔒 Running security audit..."

npm audit --audit-level=moderate > /tmp/npm-audit-$(date +%Y-%m-%d).txt
AUDIT_EXIT=$?

npx tsc --noEmit > /tmp/tsc-$(date +%Y-%m-%d).txt 2>&1
TSC_EXIT=$?

npm test > /tmp/vitest-$(date +%Y-%m-%d).txt 2>&1
TEST_EXIT=$?

if [[ $AUDIT_EXIT -ne 0 || $TSC_EXIT -ne 0 || $TEST_EXIT -ne 0 ]]; then
  echo "❌ Security audit FAILED"
  echo "   npm audit: $AUDIT_EXIT"
  echo "   tsc: $TSC_EXIT"
  echo "   tests: $TEST_EXIT"
  exit 1
fi

echo "✅ Security audit PASSED"
