# Fitovela shared agent instructions

These instructions apply to Codex, Claude, and any contributor working in this repository. This file owns the working rules. `CLAUDE.md` imports it; do not maintain a second copy of the rules.

## Start every session

1. Read this file and [docs/STATE.md](docs/STATE.md). After a handoff or context reset, reload them rather than relying on conversation memory.
2. Read [docs/PRODUCT.md](docs/PRODUCT.md), then the decisions and learnings relevant to the task.
3. Inspect the working directory, branch, uncommitted changes, and recent commits. Fetch remote state before starting or resuming branch work. Preserve unfinished work; do not discard, auto-stash, or overwrite another contributor's changes.
4. Locate the existing task and its owner. Establish its scope, acceptance criteria, branch/worktree, and review needs before editing.
5. Search the repository before creating documents, repeating research, or introducing another implementation of an existing feature.

The user's current instructions govern project scope. If they change an earlier decision, update its record. If intent is ambiguous, explain the specific conflict rather than silently choosing a new product direction.

## One home per topic

- [README.md](README.md): entry point, document map, and actual setup/check commands.
- [docs/PRODUCT.md](docs/PRODUCT.md): current requirements, assumptions, and open questions.
- [docs/DECISIONS.md](docs/DECISIONS.md): decision history, reasons, evidence, and superseded choices.
- [docs/STATE.md](docs/STATE.md): compact task ownership and current handoff.
- [docs/LEARNINGS.md](docs/LEARNINGS.md): verified reusable discoveries and corrections.

Update the existing home and link to it. Do not create competing plans, agent-specific product documents, session diaries, or duplicate research summaries. Add a topic document only when substantive content needs one; link it from the document map and move the content rather than copying it.

Distinguish proposed, accepted, implemented, and verified. A suggestion in chat is not automatically an accepted requirement. Code shows current behavior; the accepted product specification shows intended behavior. Report and resolve discrepancies rather than treating one as proof that the other is correct.

## Ownership and Git workflow

- One owner per task. Begin with sequential work; either agent can implement or review.
- Keep the primary checkout on `main`. Perform every task on a descriptive branch in a separate worktree: `feat/<task>-<name>`, `fix/<task>-<name>`, `docs/<name>`, or `chore/<name>`.
- Branch from current `origin/main`. When the task is done and its checks pass, merge the branch straight into `main` and push `main`. Do not open pull requests ([D-010](docs/DECISIONS.md)).
- Concurrent agents need distinct worktrees, branches, and non-overlapping ownership. They must not edit the same working folder or switch its branch for each other.
- Task ownership must be assigned by the user or a designated coordinator before concurrent work. `STATE.md` and worktrees are not atomic locks. The coordinator serializes assignments and shared-document integration; a stale branch is not evidence that a task is unclaimed.
- One merge per coherent task. Keep product/decision updates with the changes they describe. Fast-forward when possible; otherwise use a plain merge commit.
- Before integration, inspect current `origin/main`, reconcile intervening changes, and repeat affected checks. A conflict resolution is a code change and needs review.
- Do not force-push shared branches, erase another agent's work, bypass configured protections, or merge unrelated changes.
- After merge, verify the remote result, fast-forward the clean primary checkout, and leave an accurate handoff. Clean up a task worktree only after confirming that it has no uncommitted or unmerged work.

## Verification and review

Define observable acceptance criteria before implementation. Run checks appropriate to the change and record their actual results; do not claim a test, external review, or deployment that did not happen.

Routine documentation and low-impact edits can use recorded self-review. Significant product behavior, architecture, payment, health-assessment, privacy, or security changes require independent review before merge. The reviewer may be the other agent or a qualified human. If the required reviewer is unavailable, say so in the handoff and state what remains outstanding.

Review the actual diff and requirements. Each actionable finding should give its location, consequence, and evidence or a way to verify it. Settle technical disagreements through reproduction, tests, or primary sources. Bring unresolved product tradeoffs to the user with a recommendation.

Record the reviewed commit in the commit message or in `STATE.md`. New changes after review invalidate approval for the affected parts; review the final changes again. The author must not present a self-review as independent approval. Agent review does not replace appropriate domain expertise for health content.

The commit message for a merged task should explain the problem, resulting behavior, checks, and remaining limitations. Relevant checks must pass and blocking findings must be resolved before merge.

## Main and future production deployment

`main` is the intended production source. Once deployment is configured, merging to `main` is a release action. Branch pushes should run checks and, where supported, previews; successful main integration should deploy the merged revision after required checks pass.

Follow the task's existing merge/release authorization. Do not repeatedly request approval already given, and do not infer permission for unrelated production or live-account changes. If release scope is unclear, complete the reviewable work before asking about the release.

The initial repository has no CI, branch protection, or deployment automation. These are planned controls, not existing enforcement. Configure and verify them in a dedicated infrastructure task after the stack and hosting decisions. Include production secret handling, deployment verification, and rollback procedures in that task.

Repository work does not expand authority over live advertising accounts or the GST portal. Follow the user's standing rules if such a task is explicitly requested.

## Ad creative archive

Whenever an agent adds new Fitovela ads, save an exact copy of every final image/video used in `/Users/tushar/Desktop/fitovela ads/YYYY-MM-DD/`, using the date in Asia/Kolkata. Include all placement variants and the approved version with its audio. Preserve existing files; do not overwrite a different version. Verify copied files against their sources with SHA-256 hashes. Keep a manifest alongside the media with filenames, hashes, exact ad copy/destination, and campaign/ad IDs when available; distinguish prepared creatives from ads actually added to Meta. Never include credentials or tokens. The archive is part of completing any new-ad task.

## Learn, correct, and hand off

- Record research with its question, source/date, conclusion, confidence or limitations, and conditions that would require rechecking. Reuse it unless circumstances or evidence change.
- A reusable lesson needs evidence, scope, and a prevention step. Do not promote guesses or one agent's confidence into project facts.
- Correct factual errors with a short explanation and evidence. Preserve decision history by marking old decisions superseded and linking replacements.
- Where useful, turn a recurring failure into an automated check. Keep permanent instructions concise; do not add a rule for every trivial mistake.
- At handoff, update the existing task with owner/status, branch/worktree, commit, checks/results, unresolved issues, and the exact next step. Never leave the only useful handoff in chat or private agent memory.
- Keep `STATE.md` compact. Completed detail belongs in commits; at milestones consolidate duplicate guidance and remove obsolete instructions.
- Never commit credentials, tokens, production secrets, or real customer health responses. Use synthetic examples and redacted evidence.

## Definition of done

The agreed outcome is met; appropriate checks pass; required review is complete; affected canonical documents are current; and the handoff accurately identifies remaining work. If the task includes merge or release, verify that result before declaring that part complete.
