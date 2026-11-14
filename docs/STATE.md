# Project state and handoff

Last updated: 2026-11-14

This file owns current coordination. Read [AGENTS.md](../AGENTS.md) before acting. Branch/PR state can change after this document is written; inspect Git and GitHub at every handoff.

## Current stage

Product discovery. The founder has accepted the product hook and design direction ([D-007](DECISIONS.md), [D-008](DECISIONS.md)); medical rules wait for the doctor. There is no application or production deployment, and no implementation task is assigned.

## Current task — FTV-003

| Field | Value |
| --- | --- |
| Goal | Rewrite the product brief around the assessment-led funnel the founder approved. |
| Owner | Claude, assigned by Tushar on 2026-11-14. |
| Status | Brief rewritten; PR open for review. |
| Branch | `docs/ftv-003-product-brief`. |
| Worktree | Sibling workspace `fitovela-worktrees/ftv-003-product-brief`. |
| Deliverables outside the repo | [Funnel mockups](https://claude.ai/artifact/Vvvz5B2DvDZVXSqYZXJ1Ar) and the [doctor sign-off sheet](https://claude.ai/artifact/3WNH2yX9op8Ly7Dq5Ve3yT), both private to the founder until shared. |
| Review | Self-review only. Health-assessment content needs the doctor's answers and an independent review before merge. |

### Exact next step

1. Tushar shares the sign-off sheet with the doctor and returns her twelve answers.
2. Update [PRODUCT.md](PRODUCT.md) and D-009 with her choices; adjust the mockups where they differ.
3. Tushar decides what happens to draft PR #2, which proposes the opposite result design.

## Latest delivery — FTV-001

| Field | Value |
| --- | --- |
| Goal | Establish the shared documents and branch/worktree/PR workflow. |
| Owner | Codex. |
| Status | Documentation complete; the linked PR owns current integration status. |
| Branch | `docs/project-foundation`. |
| Worktree | Sibling workspace `fitovela-worktrees/project-foundation`. |
| Review | Documentation self-review; no independent Claude review claimed. |
| Delivery | [PR #1](https://github.com/tusshar04/fitovela/pull/1), including exact revisions, review, and merge status. |
| Verification | Whitespace and local Markdown links checked; shared Claude import confirmed; GitHub tooling status inspected. Final commit/check results are recorded in the PR. |

### Delivered scope

- The seven agreed documents exist and have distinct responsibilities.
- Claude imports the shared rules rather than duplicating them.
- The product brief preserves the founder's direction and marks unresolved proposals honestly.
- Feature branches, isolated worktrees, PR review, and `main` integration are documented.
- Future deployment intent is clearly separated from currently configured tooling.
- A PR template captures verification, review, handoff, and release implications.

### Handoff

Review the PR for exact revisions, verification results, and integration status. No application tests exist. Remaining product and infrastructure questions are intentional open work, not implemented features.

## Next task — FTV-002

- **Status:** in progress by Codex in draft [PR #2](https://github.com/tusshar04/fitovela/pull/2), not merged. Its food-first, no-condition-result proposal conflicts with accepted D-007.
- **Proposed scope:** product discovery with Tushar, using [PRODUCT.md](PRODUCT.md) as the starting point.
- **Exact next step:** discuss the first customer segment, assessment purpose, and the deliverable a customer buys; capture agreed answers and remaining questions in the existing product brief.
- **Acceptance criteria:** to be agreed when the task starts.
- **Dependencies:** founder's product decisions; later health-content expertise and research as required.
- **Implementation:** not authorized by this planning placeholder.

## Coordination notes

One writer is active at a time initially. For simultaneous work, the user or designated coordinator must assign distinct tasks before work starts and serialize updates to this file. Ownership recorded only in an unmerged branch is not a global reservation.

At handoff, record the owner, status, branch/worktree, PR or commit, checks/results, open issues, and next action. Replace this delivery detail with a short PR reference when the next task starts. Keep full history in the PR rather than growing a session log here.
