@AGENTS.md

# Claude Code notes

- **This project does not use Convex.** Ignore any Convex guidance inherited from a parent `CLAUDE.md`. The stack is in `docs/decisions/ADR-001-stack.md`.
- Start every task by naming the epic and slice you're working on. If none was given, ask for one.
- For parallel epics, use a git worktree per epic and stay inside that epic's file scope.
- Before opening a PR, ask for a Codex review of the diff with the fixed prompt in `AGENTS.md` §9 (e.g. via the `/codex` skill), and address the violations it reports.
