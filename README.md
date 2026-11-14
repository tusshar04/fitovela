# Fitovela

Fitovela is an early-stage website concept for personalized diet plans for women, with visitors arriving from category-specific Meta ads.

The project is in planning. There is no application, chosen technology stack, payment integration, or deployment pipeline yet.

## Start here

| Document | Owns |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Shared working instructions for Codex, Claude, and other contributors. |
| [CLAUDE.md](CLAUDE.md) | Claude entry point importing the shared instructions. |
| [Product](docs/PRODUCT.md) | Current product understanding, requirements, assumptions, and open questions. |
| [Decisions](docs/DECISIONS.md) | Reasons for important choices and their approval/supersession history. |
| [State](docs/STATE.md) | Active ownership, current progress, and the next handoff. |
| [Learnings](docs/LEARNINGS.md) | Verified discoveries and prevention of recurring mistakes. |

Read the shared instructions and current state before starting work. Each topic has one authoritative home; other documents should link to it.

## Contribution and release path

```text
Task and acceptance criteria
  -> feature/task branch in its own worktree
  -> implementation and relevant checks
  -> pull request targeting main
  -> review and merge
  -> production deployment from main (future; not configured)
```

`main` is the integration branch and intended future production source. Feature, fix, and documentation work goes through pull requests. See [AGENTS.md](AGENTS.md) for the complete workflow.

### Starting a task

From the primary checkout, after inspecting its status:

```sh
git status --short --branch
git fetch origin
git worktree add --no-track -b feat/ftv-002-short-description ../fitovela-worktrees/ftv-002-short-description origin/main
```

Use the actual assigned task ID, a unique branch, and an unused worktree path. Run subsequent edits and commits inside that worktree. Publish it with `git push -u origin <branch-name>` and open a PR to `main`.

The primary checkout stays on `main`; update it with `git pull --ff-only` only when clean. Never use two agents to edit the same working directory concurrently.

## Current tooling

- Build, lint, type-check, and test commands: not yet selected.
- CI, branch protection, hosting, and production deployment: not yet configured.
- Documentation checks: `git diff --check` and verification of local Markdown links.

Add real setup and verification commands here when the application stack is selected. Do not document placeholder commands as working tooling.
