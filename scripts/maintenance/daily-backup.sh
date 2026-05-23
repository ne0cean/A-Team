#!/bin/bash
cd ~/Projects/a-team || exit 1

if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "auto: daily backup [$(date +%Y-%m-%d)]"
fi

git push origin master || {
  echo "❌ Push failed"
  exit 1
}

echo "✅ Daily backup complete"
