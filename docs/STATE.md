# Project state and handoff

Last updated: 2026-11-14

This file owns current coordination. Read [AGENTS.md](../AGENTS.md) before acting. Branch/PR state can change after this document is written; inspect Git and GitHub at every handoff.

## Current stage

Shared project foundation prepared. The next stage is product discovery with Tushar. There is no application or production deployment.

## Current task — FTV-001

| Field | Value |
| --- | --- |
| Goal | Establish the shared documents and branch/worktree/PR workflow. |
| Owner | Codex. |
| Status | Documentation prepared; integration and validation evidence will be recorded in the PR. |
| Branch | `docs/project-foundation`. |
| Worktree | Sibling workspace `fitovela-worktrees/project-foundation`. |
| Review | Documentation self-review; no independent Claude review claimed. |
| Integration | PR reference to be added before merge. |

### Acceptance criteria

- The seven agreed documents exist and have distinct responsibilities.
- Claude imports the shared rules rather than duplicating them.
- The product brief preserves the founder's direction and marks unresolved proposals honestly.
- Feature branches, isolated worktrees, PR review, and `main` integration are documented.
- Future deployment intent is clearly separated from currently configured tooling.
- Documentation links and whitespace are checked; changes are committed, published, and integrated through a PR.

### Handoff

Review the PR for exact revisions, verification results, and integration status. No application tests exist. Remaining product and infrastructure questions are intentional open work, not implemented features.

## Next task — FTV-002

- **Status:** planned; not started or claimed.
- **Proposed scope:** product discovery with Tushar, using [PRODUCT.md](PRODUCT.md) as the starting point.
- **Exact next step:** discuss the first customer segment, assessment purpose, and the deliverable a customer buys; capture agreed answers and remaining questions in the existing product brief.
- **Acceptance criteria:** to be agreed when the task starts.
- **Dependencies:** founder's product decisions; later health-content expertise and research as required.
- **Implementation:** not authorized by this planning placeholder.

## Coordination notes

One writer is active at a time initially. For simultaneous work, the user or designated coordinator must assign distinct tasks before work starts and serialize updates to this file. Ownership recorded only in an unmerged branch is not a global reservation.

At handoff, record the owner, status, branch/worktree, PR or commit, checks/results, open issues, and next action. Once FTV-001 is integrated, replace its active detail with a short completed reference. Keep full history in the PR rather than growing a session log here.
