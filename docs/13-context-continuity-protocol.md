# Context Continuity Protocol (CC Mirror & Harness)

> **"Context is more valuable than code."** 
> This document defines the mechanisms ensuring that an AI agent's "mental model" and work progress are never lost, even during token exhaustion, crashes, or model switching.

---

## 1. The Context Architecture

A-Team uses a **Triple-Layer Context Mirror** to prevent loss:

1.  **In-Memory Context**: Claude's current conversation window (volatile).
2.  **On-Disk Context**: `.context/CURRENT.md` and `memory/MEMORY.md` (semi-volatile).
3.  **Git-Mirrored Context**: Automatic, frequent commits to a remote repository (persistent).

---

## 2. Component 1: The Harness (Safe Guards)

The "Harness" provides deterministic control over the AI's actions via `.claude/hooks/`.

### 🛡️ Pre-Tool Use (Prevention)
- **`pre-bash.sh`**: Blocks destructive commands (`rm -rf *`, `git reset --hard`) that could destroy progress.
- **`pre-write.sh`**: Protects core governance files and ensures the agent stays within its defined "File Ownership" (from `PARALLEL_PLAN.md`).

### 🏁 Stop-Check (Quality Gate)
- **`stop-check.sh`**: Triggered when the agent tries to end a session. It **forces** a build/test run. If the build fails, the session is *blocked from closing*, forcing the agent to fix the break before it can leave. This prevents "broken handovers."

---

## 3. Component 2: CC Mirror (Continuous Sync)

The "Mirror" (implemented via `scripts/auto-sync.sh`) ensures that even if an agent "dies" (token exhaustion), its work is saved.

### 🔄 Auto-Sync Logic
- **Frequency**: Runs in the background (as a daemon) or via hooks.
- **Atomic Commits**: Automatically stages and commits changes with a `[sync]` prefix.
- **Remote Push**: Attempts to push to GitHub frequently to ensure the "Mirror" exists outside the local machine.

### 🚪 Model Handoff (`model-exit.sh`)
- Activated via `/handoff` or `/end`.
- **Protocol**:
    1. Summarize `CURRENT.md` (NOW/NEXT/BLOCK).
    2. Commit with a specialized handover message.
    3. Clear volatile flags but keep the "Resume Point" clear.

---

## 4. Continuity Workflow (Agent Instructions)

When an agent starts a session, it **must** follow these steps to "load the mirror":

1.  **Sync Check**: Run `git pull` to ensure local files match the latest remote "Mirror."
2.  **Status Load**: Read `.context/CURRENT.md` and `memory/MEMORY.md` to reconstruct the "Mental Model."
3.  **Harness Verification**: Check `.claude/settings.json` to ensure the safety harness is active.

---

## 5. Failure Recovery (The "Token Death" Scenario)

If an agent stops due to token exhaustion:
1.  **The Mirror is Safe**: `auto-sync.sh` should have captured the last successful tool call.
2.  **The Next Agent**:
    - Reads the `git log` to see the last `[sync]` or `[handoff]` commit.
    - Specifically looks for "Incomplete" items in `A-Team/TODO.md`.
    - Resumes by picking the single most logical "NEXT" item from `CURRENT.md`.

---

## 6. Project Tagging (Context Organization)

To prevent context mixing between projects:
- Every task in `A-Team/TODO.md` **must** use a project tag: `[ProjectName] Task Description`.
- The `/todo` command automatically prepends the current directory name as the tag.

---
*Created per USER request for extreme detail in context preservation. Updated 2026-03-20.*
