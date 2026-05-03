# Vaporware Cleanup — 허상 통합 제거

**Date**: 2026-05-03
**Trigger**: Integration Audit revealed 54% health (27/50 stars)
**Root cause**: Documentation inflation, misleading commits, no verification

---

## Executive Actions Required

### Immediate (Must fix in 24h)

#### 1. Ralph Ambiguity Resolution
**Problem**: 
- Doc claims: "production-ready 566-test frankbria integration"
- Reality: `which ralph` → NOT FOUND
- Actual impl: `scripts/ralph-daemon.mjs` (644 lines, working)

**Action**: Choose ONE
- [ ] **Option A**: Complete external integration
  ```bash
  cd external/ralph-claude-code
  ./install.sh
  ralph --version  # Verify
  ```

- [ ] **Option B**: Archive external, promote internal as canonical
  ```bash
  mv external/ralph-claude-code external/_archived/ralph-claude-code
  # Update .claude/commands/ralph.md
  # Update external-references.md
  ```

**Deadline**: 2026-05-04

---

#### 2. yt-dlp Installation
**Problem**: Doc claims installed, but `which yt-dlp` → NOT FOUND

**Action**:
```bash
pip3 install --user --break-system-packages yt-dlp
which yt-dlp && yt-dlp --version
```

**Deadline**: 2026-05-04

---

#### 3. Postiz Deployment Decision
**Problem**: Commit says "가동" but no deployment

**Action**: Deploy OR downgrade to "Planned"

**Deadline**: 2026-05-06

---

#### 4. analytics.jsonl Initialization
**Problem**: Extensive logging code but file MISSING

**Action**:
```bash
touch analytics.jsonl
node scripts/dashboard.mjs  # Verify
```

**Deadline**: 2026-05-04

---

## Success Criteria

Integration health: 54% → **95%+** by 2026-05-10
