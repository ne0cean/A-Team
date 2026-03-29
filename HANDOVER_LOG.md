# Handover Log [2026-03-23]

## 🚨 Essential Status: Research Mode OFF
- **Research Mode Daemon**: **Terminated** (Killed PID 28333 in `connectome`).
- **Constraint**: Do NOT restart the background daemon until `/re` (or `/research`) command is explicitly executed by the user.
- **Reason**: Background research consumed > 95% of token budget (2,052 cycles completed).

---

## 📊 Token Usage Analysis
- **Background Research**: ~95% (2,052 runs across 7 categories).
- **Manual Work**: ~5% (Manual sessions for image upload, TUI stabilization, etc.).
- **Heaviest Categories**: `frontend`, `product`, `security`.
- **Finding**: Each of the 7 research categories runs roughly once every cycle when idle for 30 minutes, leading to massive background token drain.

---

## 🛠 Project: claude-remote (Active)
**Goal**: Stabilize iPhone PWA + Claude Code / Gemini CLI remote relay.

### Completed This Session:
1. **Terminal TUI (xterm.js) iOS Fixes**: 
   - Prevented hidden textarea from stealing focus/touch on WebKit.
   - Set xterm container to `pointer-events: none` (display only).
   - Fixed `handleSend()` to bypass unreliable form submit events on mobile.
2. **autoVibe Synchronization**:
   - Changed trigger from 300ms delay to **prompt detection** (`❯` or `/help for help`).
   - Ensures `/vibe` is only sent when Claude Code is fully ready.
3. **Image Attachment Infrastructure**:
   - Implemented `upload_image` WebSocket handler.
   - Supports base64 upload (up to 10MB) to `/tmp/claude-remote-uploads/`.
   - Client-side `useRelay` integration complete.
4. **Mobile Input & Form Submission Improvements**:
   - Removed `onKeyDown` Enter listener from Mobile Terminal `<input>` to prevent duplicate submissions or swallowed events caused by iOS IME and Chrome native form bugs.
   - Now exclusively uses React's `<form onSubmit>`, ensuring stable dispatch of commands.
5. **New Project Flow Enhancements (`NewProject.tsx`)**:
   - Added explicit UI toggles for GitHub Repository Sync and Project Visibility (Public/Private).
   - Allows users to bypass GitHub entirely and initialize purely local projects if tokens are missing.
6. **Provider Switch Integration (Gifts for Gemini)**:
   - Added `[Gemini 전환]` button directly into the `tokenLimitHit` exhaustion banner alongside the AG button.
   - Internal session is dynamically swapped to `gemini` while retaining the active workspace `cwd`.
   - Added backend `.catch()` block to gracefully handle provider switch errors.

### Next Tasks for Next Agent:
- [ ] **Image E2E Assessment**: Test full flow: Pick Photo → Upload → Relay to PTY → Claude/Gemini recognition.
- [ ] **Mobile Touch Polish**: Wait for user feedback on overall UI behavior in iPhone Chrome (Keyboard interactions, touch interference).
- [ ] **Antigravity (AG) Mode**: Expand the "AG" button to seamlessly jump into an Antigravity IDE workflow without losing context.

---

## 🏠 Project: connectome (Vibe Here)
**Goal**: Real-time spatial communication platform.

### Current State:
- MVP Features: WebRTC Voice Chat, Spatial Audio (Web Audio API), PWA with Push Notifications.
- **Status**: Stable. Recent work was mostly background research (now disabled).

### Handover Context:
- Background daemon found in `scripts/research-daemon.mjs`.
- State tracked in `.research/state.json`.

---

## 📋 Git Status Summary
- **claude-remote**: 
  - Uncommitted changes in `packages/server/src/session.ts` and `packages/web/src/components/Terminal.tsx`.
  - These include the PTY buffering, autoVibe prompt detection, and iOS touch/focus fixes.
- **connectome**:
  - No major uncommitted changes.

---

---

## 🚨 [INCIDENT REPORT] 2026-03-23 - Massive Token Drain
**Issue**: Claude Desktop usage limit reached in < 5 minutes.
**Cause**: Broad `filesystem` MCP configuration (`/Desktop/Projects`) triggered background context indexing.
**Impact**: Interrupted session, massive token waste from automated background tasks.

### 🛡️ Mitigations & Prevention:
1. **Narrow Scope**: Reduced `filesystem` MCP paths to ONLY include active project directories (prevents broad scanning).
2. **Scheduling (Cowork Mode)**: `coworkScheduledTasksEnabled` set to **FALSE** during work hours.
3. **Scheduled Script**: Created `/Users/noir/.claude/scripts/toggle-cowork.py` to automate task management.
   - **Allowed Window**: 12:00 AM ~ 05:00 AM ONLY (Low-peak background processing).
   - **Status**: Toggling logic implemented via local automation.

---

## 🏗️ Context & Efficiency Infrastructure (MCP & Skills)
**Goal**: Standardize context gathering and task automation across all projects.

### 1. Global Context Tools (Claude Desktop Config)
- **Status**: **ALL requested servers installed** in `claude_desktop_config.json`.
- **Global Base Stack**: 
  - `filesystem`: Access to `/Desktop/Projects`, `~/Downloads`, `~/Desktop`.
  - `fetch` / `puppeteer`: Scraper and browser automation tools.
  - `sequential-thinking`: Enhanced agent reasoning.
  - `github`: Managing personal/work repositories across all projects (token configured).
- **Project-Specific Hub (Mapping)**: 
  - **`connectome` / `SQL`**: `postgres-mcp`, `mysql-mcp`, `supabase` (DB Inspection).
  - **`A-Team`**: `google-drive-mcp` (Doc governance and asset management).
  - **`AI_Bubble_Dashboard`**: `google-analytics-mcp` (Usage analysis).

### 2. Project-Specific Skills (Distributed in .agent/skills/)
- **Status**: **Active** in `claude-remote`.
- **Standardized Skills**: 
  - `Add AI Provider`: For extending any LLM-powered project.
  - `Auto-Sync Daemon`: Background Git commits (usage recommended for long-term consistency).
  - `E2E Pipeline Test`: Proactive API level testing routines.
  - `Toolkit Upgrade`: Infrastructure version control.

### 📋 Next Agent: Continuous Context Management
- **Token Sensitivity**: Background tasks are disabled. Use `filesystem` with project-specific paths to maintain context without data bleed.
- **Config Management**: For `google-drive`, `supabase`, and `mysql`, ensure the user provides the necessary API/DB credentials in the global config as needed.

---

## 💡 Note to Next Agent
The infrastructure is now "Any-to-Any" ready. Use the above MCP tools to pull documentation from `google-drive` or repository history from `github` before making major structural changes.
