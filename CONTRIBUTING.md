# Contributing to A-Team

Thank you for your interest in contributing to A-Team — the global AI toolkit for Claude Code.

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit using the project format (see below)
6. Open a Pull Request against `master`

## Development Setup

```bash
git clone https://github.com/ne0cean/A-Team.git
cd A-Team
npm install
npm test
```

Requires Node.js 18+ and Claude Code installed.

## Code Style

- **TypeScript** for all scripts under `scripts/`
- **Vitest** for all tests — run with `npm test`
- No `any` types; keep strict type safety
- Follow existing file conventions — no personal style changes
- No debug statements (`console.log`, `debugger`) in committed code

## Adding a New Command

Commands live in `.claude/commands/` as Markdown files.

```
.claude/commands/
  my-command.md     # slash command definition
```

Structure of a command file:

```markdown
# /my-command

One-line description of what this command does.

## Steps
1. Step one
2. Step two
...
```

- Command name = filename without `.md`
- Keep steps declarative and model-agnostic
- If the command calls agents, reference them by role, not model name

## Adding a New Agent

Agents live in `.claude/agents/` as Markdown files.

```
.claude/agents/
  my-agent.md
```

Each agent file must include:
- `role`: what the agent does
- `inputs`: what it expects
- `outputs`: what it returns
- `constraints`: what it must not do

See existing agents for the exact front-matter schema.

## Governance Rules

Rules live in `governance/rules/`. These are enforced by hooks and agents.

- To propose a rule change, open an issue first
- Rule files use plain Markdown; no code execution
- Breaking changes to rules require a PR with rationale

## Testing Requirements

- Every change must maintain or improve the test suite (530+ tests)
- New commands: add at least one test in `tests/`
- New scripts: add unit tests covering the main code path
- Run the full suite before submitting: `npm test`
- PRs that reduce test coverage will not be merged

## Commit Format

```
[type]: summary (under 50 chars)

NOW: what this commit does
NEXT: what comes next
BLOCK: any blockers (omit if none)

Co-Authored-By: Your Name <email>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

In short: be respectful, assume good intent, and keep discussions focused on the work.
Violations can be reported to the maintainers via GitHub issues marked `conduct`.
