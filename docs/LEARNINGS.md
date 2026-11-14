# Verified learnings

This file owns reusable discoveries backed by evidence. It is not a session diary, a replacement for [decisions](DECISIONS.md), or a place to record untested assumptions.

## L-001 — Share instructions through an import

- **Verified:** 2026-11-14.
- **Scope:** repository guidance for Codex and Claude Code; verify loading when using another Claude surface or a materially different client version.
- **Finding:** Codex uses `AGENTS.md` for durable repository guidance. Claude Code supports importing another instruction file through `@path` syntax. A `CLAUDE.md` containing `@AGENTS.md` provides a shared rule source.
- **Evidence:** [OpenAI guidance](https://learn.chatgpt.com/guides/best-practices) and [Claude Code instruction imports](https://code.claude.com/docs/en/memory#import-additional-files), checked during foundation planning.
- **Prevention:** Change the shared rules in `AGENTS.md`; do not copy them into `CLAUDE.md` or private memory as a second authoritative version.
- **Limit:** File-based instructions guide behavior; they do not themselves enforce Git permissions, run reviews, or synchronize separate checkouts. The actual Claude session has not yet been checked for loading this repository's import.
- **Recheck when:** A client fails to load project instructions or a client/configuration change affects instruction discovery. Confirm the loaded files in the actual session.

## Recording a new learning

Use the next stable ID. Include:

- Date and scope/environment.
- The observation or reproducible failure.
- Evidence: relevant commit/PR, test, command result, or primary source.
- Root cause and verified correction, when applicable.
- A concrete prevention step and a condition for rechecking.

Record confidence and limitations. If evidence is missing, keep the question with its task instead of calling it verified. Correct or supersede an outdated learning with an explanation. Promote repeated, durable prevention steps into the appropriate rule or automated check, then link rather than duplicating the full rule here.
