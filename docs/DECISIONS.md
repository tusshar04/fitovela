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

## D-004 — First product and design direction

- **Status:** proposed; awaiting founder discussion.
- **Date:** 2026-11-14.
- **Proposer:** Codex; no founder approval claimed.
- **Proposal:** Lead with general women's weight management and a reusable category-entry journey. Compare Food-first and Quiz-first concepts, with Food-first as the initial recommendation.
- **Reason:** Start with a coherent offer and reusable flow while establishing the professional input needed for condition-specific services.
- **Evidence:** Founder brief and inspected reference patterns; no customer or conversion experiment yet.
- **Implementation:** Presentation concepts only. Details and unresolved tradeoffs are in [PRODUCT.md](PRODUCT.md).
- **Revisit when:** The founder selects the first segment and early customer/ad research supplies evidence.
- **Supersedes:** nothing.

## D-005 — Food profile and professional review route

- **Status:** proposed product design; clinical eligibility rules unresolved.
- **Date:** 2026-11-14.
- **Proposer:** Codex; no clinical validation or founder approval claimed.
- **Proposal:** Give visitors a traceable food/lifestyle summary and keep diagnosis separate. Route relevant reported concerns to appropriate professional review before a condition-specific purchase offer.
- **Reason/evidence:** See [L-003](LEARNINGS.md#l-003--a-questionnaire-must-not-be-treated-as-a-condition-diagnosis). Neither the source material nor this prototype establishes a validated diagnostic quiz.
- **Implementation:** The concept demonstrates a conservative review branch. Real eligibility and care rules are not implemented.
- **Revisit when:** A qualified professional defines intake and condition-related service delivery.
- **Supersedes:** nothing.

## D-006 — Offer used in the first mockup

- **Status:** proposed working assumption.
- **Date:** 2026-11-14.
- **Proposer:** Codex; no founder approval claimed.
- **Proposal:** Model a one-time INR 499, 28-day self-serve digital plan for design discussion. Exact deliverables and unresolved commercial terms live in [PRODUCT.md](PRODUCT.md).
- **Reason:** Make the paywall and delivered product concrete enough to evaluate together.
- **Evidence:** The founder suggested approximately INR 499; the 28-day duration and self-serve scope are agent proposals, not validated pricing or service commitments.
- **Implementation:** Non-transactional mockup only.
- **Revisit when:** The founder defines the deliverable, quality process, support scope, and unit economics.
- **Supersedes:** nothing.

## Adding or changing a decision

Assign the next stable ID and record status, date, owner, choice, reason, evidence, implementation status, and revisit conditions. Identify who accepted a decision; do not represent an agent suggestion as founder approval.

For a changed decision, preserve the old record, mark it superseded, and link to the replacement. Record rejected alternatives only when the reason will prevent repeated debate. Evidence can be a dated founder instruction, PR/commit, primary source, experiment, or reproducible check.
