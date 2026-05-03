---
description: Ralph Loop — Autonomous AI development with intelligent exit detection
---

# Ralph Loop for Claude Code

A-Team integrates **frankbria/ralph-claude-code** (v0.11.5) - the production-ready autonomous development loop with 566 passing tests and comprehensive safeguards.

## First-Time Setup

```bash
# Install Ralph globally (one-time)
cd ~/Projects/a-team/external/ralph-claude-code
./install.sh

# Verify installation
ralph --help
which ralph
```

After installation, `ralph`, `ralph-enable`, `ralph-setup`, and related commands are available globally.

## Quick Start

### Enable in Existing Project
```bash
cd your-project
ralph-enable                    # Interactive wizard
ralph --monitor                 # Start autonomous development
```

### Create New Project
```bash
ralph-setup my-project
cd my-project
# Edit .ralph/PROMPT.md with project goals
ralph --monitor
```

### Import from PRD/Specs
```bash
ralph-import requirements.md my-project
cd my-project
ralph --monitor
```

## Common Commands

```bash
# Start with integrated monitoring
ralph --monitor

# Custom settings
ralph --calls 50 --timeout 30           # 50 API calls/hour, 30min timeout
ralph --live --verbose                  # Live output + detailed progress
ralph --auto-reset-circuit              # Unattended operation

# Status & control
ralph --status                          # Current loop status
ralph --reset-session                   # Clear session context
ralph --circuit-status                  # Circuit breaker state

# Backup & rollback
ralph --backup                          # Enable auto-backup
ralph --rollback                        # List/restore backups
```

## Core Features

- **Autonomous Loop** - Continuous development until completion
- **Dual-Condition Exit** - Requires BOTH completion indicators AND explicit EXIT_SIGNAL from Claude
- **Rate Limiting** - 100 calls/hour default, configurable token budgets
- **Circuit Breaker** - Auto-detects stuck loops, recovers after cooldown
- **Session Continuity** - 24h context preservation across loops
- **Live Streaming** - Real-time visibility with `--live`
- **5-Hour API Limit** - Smart detection + auto-wait for unattended mode
- **File Protection** - Multi-layer safeguards prevent config deletion
- **Backup/Rollback** - Git branches before each loop

## Project Structure

```
my-project/
├── .ralph/                 # Ralph config (hidden)
│   ├── PROMPT.md           # Development instructions
│   ├── fix_plan.md         # Prioritized tasks
│   ├── AGENT.md            # Build/run commands
│   ├── specs/              # Specifications
│   └── logs/               # Execution logs
├── .ralphrc                # Project settings
└── src/                    # Source code
```

## Configuration (.ralphrc)

```bash
PROJECT_NAME="my-project"
PROJECT_TYPE="typescript"

# Claude CLI (auto-detected)
CLAUDE_CODE_CMD="claude"

# Loop settings
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=15
CLAUDE_OUTPUT_FORMAT="json"
MAX_TOKENS_PER_HOUR=0  # 0 = disabled

# Tool permissions
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"

# Session management
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=24

# Circuit breaker
CB_NO_PROGRESS_THRESHOLD=3
CB_SAME_ERROR_THRESHOLD=5
CB_COOLDOWN_MINUTES=30
CB_AUTO_RESET=false
```

## RALPH_STATUS Block

Claude includes this in each loop response:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <next action>
---END_RALPH_STATUS---
```

**Set EXIT_SIGNAL: true only when:**
1. ✅ All fix_plan.md items marked [x]
2. ✅ All tests passing
3. ✅ No errors/warnings
4. ✅ All specs/ requirements implemented
5. ✅ No meaningful work remaining

## Best Practices

### Effective Prompts
1. **Be Specific** - Clear requirements → better results
2. **Prioritize** - Use `.ralph/fix_plan.md` to guide focus
3. **Set Boundaries** - Define scope clearly
4. **Include Examples** - Show expected behavior

### File Management
- `.ralph/PROMPT.md` - High-level goals (customize)
- `.ralph/fix_plan.md` - Specific tasks (modify freely)
- `.ralph/AGENT.md` - Build commands (auto-maintained)
- `.ralph/specs/` - Detailed requirements (add as needed)

## Monitoring

### tmux Integration
```bash
ralph --monitor              # Integrated session

# Manual control
tmux list-sessions          # View sessions
tmux attach -t <name>       # Reattach
# Ctrl+B then D             # Detach (keeps running)
# Ctrl+B then ←/→           # Switch panes
```

Shows real-time:
- Loop count & status
- API calls (used/limit)
- Recent logs
- Circuit breaker state
- Rate limit countdown

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ralph not found | Run `./install.sh` from `external/ralph-claude-code` |
| Stuck loops | Check `.ralph/fix_plan.md` clarity |
| Premature exit | Ralph respects `EXIT_SIGNAL: false` |
| Timeouts | Increase `--timeout` value |
| Session lost | `tmux attach -t <name>` |
| Permission denied | Update `ALLOWED_TOOLS` in `.ralphrc` |
| macOS timeout error | `brew install coreutils` |

## Advanced Features

### Backup & Rollback
```bash
ralph --backup              # Enable auto-backup before each loop
ralph --rollback            # List available backups
ralph --rollback <branch>   # Restore specific backup
```

### Desktop Notifications
```bash
ralph --notify              # Enable completion notifications
# Or in .ralphrc: ENABLE_NOTIFICATIONS=true
```

### Token Budgets
```bash
# In .ralphrc
MAX_TOKENS_PER_HOUR=500000  # Cap cumulative tokens (0 = unlimited)
```

### Live Streaming
```bash
ralph --live                # Real-time output
tail -f .ralph/live.log     # Watch in another terminal
```

## Documentation

Full docs at `~/Projects/a-team/external/ralph-claude-code/`:
- `README.md` - Complete guide
- `IMPLEMENTATION_PLAN.md` - Roadmap
- `TESTING.md` - Test suite guide
- `CONTRIBUTING.md` - Development guide
- `SPECIFICATION_WORKSHOP.md` - Prompt writing

## Version Info

- **Current**: v0.11.5 (Active Development)
- **Tests**: 566 passing (100% pass rate)
- **Repository**: https://github.com/frankbria/ralph-claude-code
- **License**: MIT

## Migration from Old Ralph

Old A-Team implementation (`ralph-daemon.mjs`) is deprecated. New features:
- 566 comprehensive tests vs minimal testing
- Production-grade circuit breaker
- Session continuity (24h)
- Live streaming output
- File protection (multi-layer)
- Interactive project setup
- Community-standard `.ralph/` structure

**To migrate:**
1. Install new Ralph: `cd ~/Projects/a-team/external/ralph-claude-code && ./install.sh`
2. In project: `ralph-enable` (auto-detects and migrates)
3. Run: `ralph --monitor`

## Credits

- Original [Ralph technique](https://ghuntley.com/ralph/) by Geoffrey Huntley
- Implementation by [frankbria](https://github.com/frankbria)
- Built for [Claude Code](https://claude.ai/code) by Anthropic
