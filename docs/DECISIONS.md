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

IDs D-004 to D-006 are used by proposals in draft [PR #2](https://github.com/tusshar04/fitovela/pull/2) and are left unused here to avoid a clash.

## D-007 — The assessment is the product; the diet is the unlock

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** The funnel leads with a free symptom assessment across PCOS / PCOD signs, insulin resistance, inflammation and thyroid, plus meal preferences. It tells the visitor which pattern her answers match, then sells the diet plan for that pattern as a paid unlock. The questionnaire should feel like a diagnosis taking place.
- **Reason:** The founder named this the most crucial USP. A funnel that leads with "diet plan" does not differentiate.
- **Evidence:** Founder instruction in the 2026-11-14 design session, after reviewing mockups that led with a diet plan.
- **Implementation:** Mockups only; see [PRODUCT.md](PRODUCT.md). No assessment logic exists.
- **Revisit when:** The doctor's answers limit what a questionnaire may report, or test ads show the assessment hook does not convert.
- **Supersedes:** nothing merged. It conflicts with proposed D-005 in draft PR #2 (food profile, no condition result).

## D-008 — Quiz-funnel style and visual direction

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Follow the global quiz-funnel pattern (BetterMe, Reverse Health, Noom) localised for India: age tiles as the first tap, one question per screen, a mid-quiz finding, a prediction chart, and a paywall with a timed offer and three tiers priced per day. Light pages, bold sans headlines with an italic serif accent, rani pink and deep plum, real photography.
- **Reason:** The founder rejected a first set of generic mockups and asked for the selling style of the category leaders. Offered the quiz funnel or the Indian long sales page (ToneOp), he chose the quiz funnel.
- **Evidence:** Founder's choices and "this is good" on the revised mockups, 2026-11-14.
- **Implementation:** [Fitovela Funnel Mockups](https://claude.ai/artifact/Vvvz5B2DvDZVXSqYZXJ1Ar). Photos are Unsplash stand-ins approved for mockups only.
- **Revisit when:** Real ad tests favour another structure.
- **Supersedes:** nothing.

## D-009 — Result wording and medical rules wait for the doctor

- **Status:** proposed; awaiting the doctor's answers and the founder's confirmation.
- **Date:** 2026-11-14.
- **Proposer:** Claude; no founder or medical approval claimed.
- **Proposal:** Word the result as "Your symptoms match [type]" with a line that it is not a medical diagnosis and which tests confirm it. Treat scoring cut-offs, exclusions, calorie floor, prediction pace and named PCOS types as open until the doctor picks an option for each on the [sign-off sheet](https://claude.ai/artifact/3WNH2yX9op8Ly7Dq5Ve3yT).
- **Reason:** A questionnaire cannot establish a condition, and a flat "you have PCOS" is the claim most likely to cause legal or ad-account trouble. The diagnostic feel comes from the structure of the assessment.
- **Evidence:** None beyond reasoning; no legal or clinical review yet.
- **Implementation:** Mockup wording and sample values only.
- **Revisit when:** The doctor returns her twelve answers.
- **Supersedes:** nothing.

## Adding or changing a decision

Assign the next stable ID and record status, date, owner, choice, reason, evidence, implementation status, and revisit conditions. Identify who accepted a decision; do not represent an agent suggestion as founder approval.

For a changed decision, preserve the old record, mark it superseded, and link to the replacement. Record rejected alternatives only when the reason will prevent repeated debate. Evidence can be a dated founder instruction, PR/commit, primary source, experiment, or reproducible check.
