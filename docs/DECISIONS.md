# Decisions

This file owns the rationale and history of important decisions. Current product requirements live in [PRODUCT.md](PRODUCT.md); working rules live in [AGENTS.md](../AGENTS.md). Link to those sources instead of maintaining duplicate specifications here.

Statuses: **proposed**, **accepted**, **superseded**, or **rejected**. Acceptance does not prove implementation; record implementation evidence separately.

## D-001 — Shared repository record

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Codex and Claude use one versioned set of working rules, product context, decisions, task state, and verified learnings. Every topic has one canonical home.
- **Reason:** Avoid repeated discovery, conflicting documents, and dependence on individual conversations or private memories.
- **Evidence:** The founder accepted the proposed working agreement and requested creation of its documents.
- **Implementation:** The document map is in [README.md](../README.md); `CLAUDE.md` imports `AGENTS.md` rather than copying its contents.
- **Revisit when:** The structure cannot support actual tasks without duplication. Add specialized documents only when needed.
- **Supersedes:** nothing.

## D-002 — Task ownership and evidence-based review

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Use one owner per task, sequential work initially, and isolated worktrees for concurrent implementation. Review significant changes independently and preserve verified corrections in the shared record.
- **Reason:** Prevent overlapping edits and make disagreements resolvable through evidence.
- **Evidence:** The founder accepted the proposed working agreement and confirmed separate worktrees.
- **Implementation:** The ownership, review, and handoff rules are in [AGENTS.md](../AGENTS.md). Coordination is currently manual; no automatic Codex-to-Claude dispatch is configured.
- **Revisit when:** Multiple concurrent tasks justify additional coordination tooling.
- **Supersedes:** nothing.

## D-003 — Feature branches, main integration, and future production

- **Status:** accepted; deployment and enforcement not yet implemented.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Work happens on task branches in separate worktrees and reaches `main` through PRs. `main` is the intended source of future production deployments.
- **Reason:** Keep changes reviewable and connect production releases to integrated, verified revisions.
- **Evidence:** The founder explicitly requested feature branches merged into `main`, with future production deployment triggered from that flow.
- **Implementation:** Branch/worktree/PR conventions are documented. CI checks, branch protections, hosting, preview deployments, production triggers, and rollback remain a future infrastructure task.
- **Bootstrap note:** The repository had no commits or remote branches. One empty root commit established `main` so the foundation itself could be delivered through a feature-branch PR. This does not establish an ongoing direct-push exception.
- **Revisit when:** Selecting hosting and release controls. Any alternative production branch strategy requires an explicit decision.
- **Supersedes:** nothing.

## Adding or changing a decision

Assign the next stable ID and record status, date, owner, choice, reason, evidence, implementation status, and revisit conditions. Identify who accepted a decision; do not represent an agent suggestion as founder approval.

For a changed decision, preserve the old record, mark it superseded, and link to the replacement. Record rejected alternatives only when the reason will prevent repeated debate. Evidence can be a dated founder instruction, PR/commit, primary source, experiment, or reproducible check.
